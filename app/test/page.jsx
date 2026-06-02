'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const STEPS = 500
const NAV_H = 68  // keep car below fixed nav

function buildPoints(isMobile) {
  const vw     = window.innerWidth
  const vh     = window.innerHeight
  const cx     = isMobile ? vw * 0.50 : vw * 0.88
  const amp    = isMobile ? vw * 0.16 : vw * 0.04
  const yStart = NAV_H
  const yEnd   = vh - 12
  const cycles = 2.5

  return Array.from({ length: STEPS + 1 }, (_, i) => {
    const t     = i / STEPS
    const x     = cx + amp * Math.sin(t * cycles * Math.PI * 2)
    const y     = yStart + t * (yEnd - yStart)
    const dx    = amp * cycles * Math.PI * 2 * Math.cos(t * cycles * Math.PI * 2)
    const dy    = yEnd - yStart
    const angle = Math.atan2(dy, dx) * 180 / Math.PI
    return { x, y, angle }
  })
}

function poly(pts) {
  return pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

const DONUT_SPEED = 4500   // ms per revolution — very slow and dramatic
const TIRE_INTERVAL = 90   // ms between mark drops
// Rear-tyre offsets in car-local space (car faces +x)
const REAR_TYRES = [{ lx: -13, ly: 8 }, { lx: -13, ly: -8 }]

export default function TestPage() {
  const [isMobile, setIsMobile] = useState(false)

  const pointsRef       = useRef([])
  const carRef          = useRef(null)    // outer div: translate
  const carInnerRef     = useRef(null)    // inner div: rotate + donut
  const tireMarksSvgRef = useRef(null)    // fixed SVG layer for skid marks
  const rl1 = useRef(null), rl2 = useRef(null), rl3 = useRef(null), rl4 = useRef(null)
  const rafRef          = useRef(null)
  const stopTimer       = useRef(null)
  const tireInterval    = useRef(null)
  const donutStopTimer  = useRef(null)   // 30 s auto-stop
  const isDonuting      = useRef(false)
  const lastAngle       = useRef(90)
  const lastX           = useRef(0)
  const lastY           = useRef(0)
  const donutStart      = useRef(0)       // timestamp when donut began

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    function init() {
      const pts = buildPoints(isMobile)
      pointsRef.current = pts
      const p = poly(pts)
      ;[rl1, rl2, rl3, rl4].forEach(r => r.current?.setAttribute('points', p))
      tick(0)
    }

    function tick(p) {
      if (!carRef.current || !carInnerRef.current || !pointsRef.current.length) return
      const { x, y, angle } = pointsRef.current[Math.min(Math.round(p * STEPS), STEPS)]
      lastAngle.current = angle
      lastX.current = x
      lastY.current = y
      carRef.current.style.transform      = `translate(${x}px,${y}px)`
      carInnerRef.current.style.transform = `rotate(${angle}deg)`
    }

    // ── Tire marks ──────────────────────────────────────────────────
    function dropMark() {
      const svg = tireMarksSvgRef.current
      if (!svg) return
      const cx  = lastX.current
      const cy  = lastY.current
      // Elapsed time in ms → current spin angle in radians
      const elapsed   = Date.now() - donutStart.current
      const spinRad   = (elapsed / DONUT_SPEED) * Math.PI * 2
      const ns = 'http://www.w3.org/2000/svg'

      REAR_TYRES.forEach(({ lx, ly }) => {
        // Rotate local offset by current spin angle → world position
        const wx = cx + lx * Math.cos(spinRad) - ly * Math.sin(spinRad)
        const wy = cy + lx * Math.sin(spinRad) + ly * Math.cos(spinRad)

        const ellipse = document.createElementNS(ns, 'ellipse')
        ellipse.setAttribute('cx', wx.toFixed(1))
        ellipse.setAttribute('cy', wy.toFixed(1))
        ellipse.setAttribute('rx', '3.5')
        ellipse.setAttribute('ry', '1.8')
        // Orient the mark perpendicular to the radius (tangent of the circle)
        const tangentDeg = (spinRad * 180 / Math.PI) + 90
        ellipse.setAttribute('transform', `rotate(${tangentDeg.toFixed(1)} ${wx.toFixed(1)} ${wy.toFixed(1)})`)
        ellipse.setAttribute('fill', 'rgba(0,0,0,0.75)')
        ellipse.style.opacity = '1'
        svg.appendChild(ellipse)

        // Fade out over 2 s
        requestAnimationFrame(() => {
          ellipse.style.transition = 'opacity 2s ease-out'
          ellipse.style.opacity    = '0'
        })
        setTimeout(() => ellipse.remove(), 2100)
      })
    }

    function stopDonut() {
      if (!carInnerRef.current) return
      isDonuting.current = false
      clearInterval(tireInterval.current)
      clearTimeout(donutStopTimer.current)
      carInnerRef.current.style.animation = 'none'
      carInnerRef.current.style.transform = `rotate(${lastAngle.current}deg)`
    }

    function startDonut() {
      if (!carInnerRef.current || isDonuting.current) return
      isDonuting.current   = true
      donutStart.current   = Date.now()
      carInnerRef.current.style.animation = `cr-donut ${DONUT_SPEED}ms linear infinite`
      tireInterval.current = setInterval(dropMark, TIRE_INTERVAL)
      // Auto-stop after 30 s — car parks until next scroll
      donutStopTimer.current = setTimeout(stopDonut, 30000)
    }

    function update() {
      const max = document.documentElement.scrollHeight - window.innerHeight
      tick(max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0)
    }

    init()
    update()

    const onScroll = () => {
      if (isDonuting.current) stopDonut()
      clearTimeout(stopTimer.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(update)
      stopTimer.current = setTimeout(startDonut, 600)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', () => { init(); update() })
    stopTimer.current = setTimeout(startDonut, 1500)

    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(stopTimer.current)
      clearTimeout(donutStopTimer.current)
      clearInterval(tireInterval.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isMobile])

  return (
    <div style={{ background: '#0F1E14', fontFamily: 'var(--font-inter),sans-serif' }}>
      <style>{`@keyframes cr-donut { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
       .cr-tyre-mark { transition: opacity 2s ease-out; }`}</style>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.5rem', height: `${NAV_H}px`, background: 'rgba(10,20,13,0.9)', backdropFilter: 'blur(12px)', borderBottom: '0.5px solid rgba(197,168,130,0.12)' }}>
        <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.1rem', fontWeight: '300', color: '#F5F1EC', letterSpacing: '0.04em' }}>Canvas Routes</span>
        <Link href="/" style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)', textDecoration: 'none' }}>← Back</Link>
      </nav>

      {/* ── FIXED road — covers full viewport, always visible ── */}
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10, overflow: 'visible' }}>
        <polyline ref={rl1} fill="none" stroke="rgba(197,168,130,0.06)" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
        <polyline ref={rl2} fill="none" stroke="rgba(197,168,130,0.14)" strokeWidth="7"  strokeLinecap="round" strokeLinejoin="round" />
        <polyline ref={rl3} fill="none" stroke="rgba(8,18,12,0.95)"     strokeWidth="5"  strokeLinecap="round" strokeLinejoin="round" />
        <polyline ref={rl4} fill="none" stroke="rgba(197,168,130,0.6)"  strokeWidth="1"  strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 12" />
      </svg>

      {/* ── FIXED tire marks layer (below car) ── */}
      <svg ref={tireMarksSvgRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }} />

      {/* ── FIXED car — top-down satellite view ── */}
      {/* outer div: translate (position on road) */}
      <div ref={carRef} style={{ position: 'fixed', top: 0, left: 0, width: '44px', height: '22px', marginLeft: '-22px', marginTop: '-11px', willChange: 'transform', pointerEvents: 'none', zIndex: 12 }}>
        {/* inner div: rotate (facing direction + donut spin) */}
        <div ref={carInnerRef} style={{ width: '100%', height: '100%', transformOrigin: '50% 50%' }}>
          <svg viewBox="0 0 44 22" width="44" height="22" style={{ display: 'block', overflow: 'visible' }}>
            {/* Shadow */}
            <ellipse cx="23" cy="13" rx="19" ry="9" fill="rgba(0,0,0,0.35)" />
            {/* Body */}
            <rect x="2" y="3" width="40" height="16" rx="5" fill="#c5a882" />
            {/* Cabin roof */}
            <rect x="11" y="4" width="18" height="14" rx="3" fill="rgba(10,20,14,0.22)" />
            {/* Windshield (front = right) */}
            <rect x="27" y="4.5" width="9" height="13" rx="2.5" fill="rgba(160,210,235,0.35)" stroke="rgba(197,168,130,0.25)" strokeWidth="0.5" />
            {/* Rear window */}
            <rect x="5"  y="5"   width="7" height="12" rx="2"   fill="rgba(160,210,235,0.2)"  stroke="rgba(197,168,130,0.15)" strokeWidth="0.5" />
            {/* Roof highlight */}
            <rect x="13" y="4.5" width="9" height="13" rx="2"   fill="rgba(255,255,255,0.07)" />
            {/* Door line */}
            <line x1="22" y1="3" x2="22" y2="19" stroke="rgba(0,0,0,0.18)" strokeWidth="0.6" />
            {/* Wheels — 4 corners */}
            <rect x="1"  y="1"  width="7" height="5" rx="1.5" fill="#111" />
            <rect x="1"  y="16" width="7" height="5" rx="1.5" fill="#111" />
            <rect x="36" y="1"  width="7" height="5" rx="1.5" fill="#111" />
            <rect x="36" y="16" width="7" height="5" rx="1.5" fill="#111" />
            {/* Headlights (front = right) */}
            <circle cx="42.5" cy="5"  r="2"   fill="rgba(255,250,190,0.95)" />
            <circle cx="42.5" cy="17" r="2"   fill="rgba(255,250,190,0.95)" />
            {/* Tail lights */}
            <circle cx="1.5"  cy="5"  r="1.5" fill="rgba(220,60,60,0.75)" />
            <circle cx="1.5"  cy="17" r="1.5" fill="rgba(220,60,60,0.75)" />
          </svg>
        </div>
      </div>

      {/* ── Scrollable page content ── */}
      <div style={{ paddingTop: `${NAV_H}px` }}>

        {/* Hero */}
        <section style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 3rem', position: 'relative' }}>
          <div style={{ maxWidth: isMobile ? '100%' : '48%' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1.25rem' }}>Canvas Routes · Season 2026</div>
            <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.8rem,5vw,4.5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.06, letterSpacing: '-0.01em', marginBottom: '1.25rem' }}>
              Every road<br />worth driving.
            </h1>
            <div style={{ width: '36px', height: '0.5px', background: 'rgba(197,168,130,0.5)', marginBottom: '1.25rem' }} />
            <p style={{ fontSize: '14px', color: 'rgba(245,241,236,0.45)', lineHeight: 1.9, maxWidth: '320px', marginBottom: '2rem' }}>
              Curated road trips and convoy drives across Quebec and beyond.
            </p>
            <Link href="/membership" style={{ display: 'inline-block', padding: '0.85rem 2.25rem', background: '#c5a882', color: '#0F1E14', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: '600' }}>
              Join Canvas Routes
            </Link>
          </div>
          <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.3)', marginBottom: '0.4rem' }}>Scroll</div>
            <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="rgba(197,168,130,0.25)" strokeWidth="1.2" strokeLinecap="round">
              <line x1="6" y1="0" x2="6" y2="12"/><polyline points="2 8 6 12 10 8"/>
            </svg>
          </div>
        </section>

        {/* Section 2 */}
        <section style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 3rem' }}>
          <div style={{ maxWidth: isMobile ? '100%' : '48%' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1rem' }}>The Route</div>
            <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>
              Backroads.<br />No shortcuts.
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(245,241,236,0.45)', lineHeight: 1.9, maxWidth: '320px' }}>
              We plan every route to avoid highways. Winding two-lane roads, elevation changes and long sweeping corners — the kind of roads you came for.
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 3rem' }}>
          <div style={{ maxWidth: isMobile ? '100%' : '48%' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1rem' }}>The Experience</div>
            <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>
              Every detail<br />is handled.
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(245,241,236,0.45)', lineHeight: 1.9, maxWidth: '320px' }}>
              Breakfast before departure. Stops along the route. Group lunch, farewell drinks, and your car photographed on the road.
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 3rem' }}>
          <div style={{ maxWidth: isMobile ? '100%' : '48%' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1rem' }}>Membership</div>
            <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>
              Your seat<br />is held.
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(245,241,236,0.45)', lineHeight: 1.9, maxWidth: '320px' }}>
              Members get first access to every route before public registration opens.
            </p>
          </div>
        </section>

      </div>

      {/* Below fold */}
      <section style={{ background: '#F5F1EC', padding: '6rem 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>You made it</div>
          <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.1, marginBottom: '1.25rem' }}>Normal content lives here.</div>
          <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '0 auto 1.5rem' }} />
          <Link href="/" style={{ display: 'inline-block', padding: '0.8rem 2rem', background: '#0F1E14', color: '#F5F1EC', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', textDecoration: 'none' }}>Back to homepage</Link>
        </div>
      </section>

    </div>
  )
}
