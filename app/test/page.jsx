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

export default function TestPage() {
  const [isMobile, setIsMobile] = useState(false)

  const pointsRef    = useRef([])
  const carRef       = useRef(null)   // outer div — handles translate only
  const carInnerRef  = useRef(null)   // inner div — handles rotate (+ donut spin)
  const rl1 = useRef(null), rl2 = useRef(null), rl3 = useRef(null), rl4 = useRef(null)
  const rafRef       = useRef(null)
  const stopTimer    = useRef(null)
  const isDonuting   = useRef(false)
  const lastAngle    = useRef(90)

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
      // outer = position, inner = direction
      carRef.current.style.transform     = `translate(${x}px,${y}px)`
      carInnerRef.current.style.transform = `rotate(${angle}deg)`
    }

    function startDonut() {
      if (!carInnerRef.current) return
      isDonuting.current = true
      carInnerRef.current.style.animation = 'cr-donut 0.55s linear infinite'
    }

    function stopDonut() {
      if (!carInnerRef.current) return
      isDonuting.current = false
      carInnerRef.current.style.animation  = 'none'
      carInnerRef.current.style.transform  = `rotate(${lastAngle.current}deg)`
    }

    function update() {
      const max = document.documentElement.scrollHeight - window.innerHeight
      tick(max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0)
    }

    init()
    update()

    const onScroll = () => {
      // Stop donut the moment scrolling resumes
      if (isDonuting.current) stopDonut()
      clearTimeout(stopTimer.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(update)
      // Start donut 600 ms after scroll stops
      stopTimer.current = setTimeout(startDonut, 600)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', () => { init(); update() })

    // Start donuts if user hasn't scrolled after 1.5 s
    stopTimer.current = setTimeout(startDonut, 1500)

    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(stopTimer.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isMobile])

  return (
    <div style={{ background: '#0F1E14', fontFamily: 'var(--font-inter),sans-serif' }}>
      <style>{`@keyframes cr-donut { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

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

      {/* ── FIXED car — outer=position, inner=rotation+donut ── */}
      <div ref={carRef} style={{ position: 'fixed', top: 0, left: 0, width: '28px', height: '12px', marginLeft: '-14px', marginTop: '-6px', willChange: 'transform', pointerEvents: 'none', zIndex: 11 }}>
        <div ref={carInnerRef} style={{ width: '100%', height: '100%', transformOrigin: '50% 50%' }}>
          <svg viewBox="0 0 28 12" width="28" height="12" style={{ display: 'block' }}>
            <ellipse cx="14" cy="11.5" rx="12" ry="1.5" fill="rgba(0,0,0,0.45)" />
            <rect    x="1"  y="4"  width="26" height="7" rx="2"             fill="#c5a882" />
            <path    d="M 6 4 L 9 1 L 19 1 L 22 4 Z"                        fill="#c5a882" />
            <path    d="M 7.5 4 L 10 1.5 L 18 1.5 L 20.5 4 Z"              fill="rgba(10,20,14,0.72)" />
            <circle  cx="6"  cy="11" r="2.5" fill="#0F1E14" stroke="#F5F1EC" strokeWidth="1" />
            <circle  cx="22" cy="11" r="2.5" fill="#0F1E14" stroke="#F5F1EC" strokeWidth="1" />
            <rect    x="25.5" y="6" width="2" height="2.5" rx="0.4"         fill="rgba(255,245,180,0.95)" />
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
