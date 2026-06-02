'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const STEPS = 500
const NAV_H = 68

function buildPoints(isMobile) {
  const vw     = window.innerWidth
  const vh     = window.innerHeight
  const cx     = isMobile ? vw * 0.50 : vw * 0.88
  const amp    = isMobile ? vw * 0.16 : vw * 0.04
  const yStart = NAV_H
  const yEnd   = vh - 12
  const cycles = 2.5

  return Array.from({ length: STEPS + 1 }, (_, i) => {
    const t  = i / STEPS
    const x  = cx + amp * Math.sin(t * cycles * Math.PI * 2)
    const y  = yStart + t * (yEnd - yStart)
    const dx = amp * cycles * Math.PI * 2 * Math.cos(t * cycles * Math.PI * 2)
    const dy = yEnd - yStart
    const angle = Math.atan2(dy, dx) * 180 / Math.PI
    return { x, y, angle }
  })
}

function poly(pts) {
  return pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

const DONUT_SPEED   = 4500
const TIRE_INTERVAL = 90
// Rear-tyre offsets in car-local space (44×22 viewBox, car faces +x, center at 22,11)
// Rear wheel rects: x=4 w=7 → centerX=7.5; y=-0.5 h=8.5 → centerY=3.75, y=14 h=8.5 → centerY=18.25
const REAR_TYRES = [{ lx: -14.5, ly: -7.25 }, { lx: -14.5, ly: 7.25 }]
// Front axle offset from car center in local +x direction (front wheels at x=36.5+5.5/2=39.25, center=22)
const FRONT_AXLE_OFFSET = 17

export default function TestPage() {
  const [isMobile, setIsMobile] = useState(false)

  const pointsRef         = useRef([])
  const carRef            = useRef(null)
  const carInnerRef       = useRef(null)
  const tireMarksSvgRef   = useRef(null)
  const rl1 = useRef(null), rl2 = useRef(null), rl3 = useRef(null), rl4 = useRef(null)
  const rafRef            = useRef(null)
  const donutRafRef       = useRef(null)
  const stopTimer         = useRef(null)
  const tireInterval      = useRef(null)
  const donutStopTimer    = useRef(null)
  const isDonuting        = useRef(false)
  const lastAngle         = useRef(90)
  const lastX             = useRef(0)
  const lastY             = useRef(0)
  const donutStart        = useRef(0)
  const donutBaseAngleRef = useRef(0)
  const donutPivotX       = useRef(0)
  const donutPivotY       = useRef(0)
  const donutCarX         = useRef(0)
  const donutCarY         = useRef(0)

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
      carRef.current.style.transform          = `translate(${x}px,${y}px)`
      carRef.current.style.opacity            = '1'
      carInnerRef.current.style.transform     = `rotate(${angle}deg)`
    }

    function dropMark() {
      const svg = tireMarksSvgRef.current
      if (!svg) return
      const cx       = donutCarX.current
      const cy       = donutCarY.current
      const elapsed  = Date.now() - donutStart.current
      const spinRad  = (elapsed / DONUT_SPEED) * Math.PI * 2
      const totalRad = donutBaseAngleRef.current + spinRad
      const ns       = 'http://www.w3.org/2000/svg'

      REAR_TYRES.forEach(({ lx, ly }) => {
        const wx = cx + lx * Math.cos(totalRad) - ly * Math.sin(totalRad)
        const wy = cy + lx * Math.sin(totalRad) + ly * Math.cos(totalRad)

        const ellipse = document.createElementNS(ns, 'ellipse')
        ellipse.setAttribute('cx', wx.toFixed(1))
        ellipse.setAttribute('cy', wy.toFixed(1))
        ellipse.setAttribute('rx', '3.5')
        ellipse.setAttribute('ry', '1.8')
        const tangentDeg = (totalRad * 180 / Math.PI) + 90
        ellipse.setAttribute('transform', `rotate(${tangentDeg.toFixed(1)} ${wx.toFixed(1)} ${wy.toFixed(1)})`)
        ellipse.setAttribute('fill', 'rgba(0,0,0,0.75)')
        ellipse.style.opacity = '1'
        svg.appendChild(ellipse)

        requestAnimationFrame(() => {
          ellipse.style.transition = 'opacity 2s ease-out'
          ellipse.style.opacity    = '0'
        })
        setTimeout(() => ellipse.remove(), 2100)
      })
    }

    function stopDonut() {
      if (!carInnerRef.current || !carRef.current) return
      isDonuting.current = false
      cancelAnimationFrame(donutRafRef.current)
      clearInterval(tireInterval.current)
      clearTimeout(donutStopTimer.current)
      carRef.current.style.transform      = `translate(${lastX.current}px,${lastY.current}px)`
      carInnerRef.current.style.transform = `rotate(${lastAngle.current}deg)`
    }

    function startDonut() {
      if (!carInnerRef.current || !carRef.current || isDonuting.current) return
      isDonuting.current        = true
      donutStart.current        = Date.now()
      const baseAngle           = lastAngle.current
      const baseAngleRad        = baseAngle * Math.PI / 180
      donutBaseAngleRef.current = baseAngleRad

      // Front axle world position — stays fixed as the pivot point
      donutPivotX.current = lastX.current + FRONT_AXLE_OFFSET * Math.cos(baseAngleRad)
      donutPivotY.current = lastY.current + FRONT_AXLE_OFFSET * Math.sin(baseAngleRad)
      donutCarX.current   = lastX.current
      donutCarY.current   = lastY.current

      function spinFrame() {
        if (!isDonuting.current || !carInnerRef.current || !carRef.current) return
        const elapsed  = Date.now() - donutStart.current
        const spinRad  = (elapsed / DONUT_SPEED) * Math.PI * 2
        const totalRad = baseAngleRad + spinRad
        const totalDeg = baseAngle + (elapsed / DONUT_SPEED) * 360

        // Car center orbits the fixed front-axle pivot
        const cx = donutPivotX.current - FRONT_AXLE_OFFSET * Math.cos(totalRad)
        const cy = donutPivotY.current - FRONT_AXLE_OFFSET * Math.sin(totalRad)
        donutCarX.current = cx
        donutCarY.current = cy

        carRef.current.style.transform      = `translate(${cx}px,${cy}px)`
        carInnerRef.current.style.transform = `rotate(${totalDeg}deg)`
        donutRafRef.current = requestAnimationFrame(spinFrame)
      }
      donutRafRef.current    = requestAnimationFrame(spinFrame)
      tireInterval.current   = setInterval(dropMark, TIRE_INTERVAL)
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

    const onResize = () => { init(); update() }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    stopTimer.current = setTimeout(startDonut, 1500)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      clearTimeout(stopTimer.current)
      clearTimeout(donutStopTimer.current)
      clearInterval(tireInterval.current)
      cancelAnimationFrame(rafRef.current)
      cancelAnimationFrame(donutRafRef.current)
      if (tireMarksSvgRef.current) tireMarksSvgRef.current.innerHTML = ''
    }
  }, [isMobile])

  return (
    <div style={{ background: '#0F1E14', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.5rem', height: `${NAV_H}px`, background: 'rgba(10,20,13,0.9)', backdropFilter: 'blur(12px)', borderBottom: '0.5px solid rgba(197,168,130,0.12)' }}>
        <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.1rem', fontWeight: '300', color: '#F5F1EC', letterSpacing: '0.04em' }}>Canvas Routes</span>
        <Link href="/" style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)', textDecoration: 'none' }}>← Back</Link>
      </nav>

      {/* Fixed road */}
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10, overflow: 'visible' }}>
        <polyline ref={rl1} fill="none" stroke="rgba(197,168,130,0.06)" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
        <polyline ref={rl2} fill="none" stroke="rgba(197,168,130,0.14)" strokeWidth="7"  strokeLinecap="round" strokeLinejoin="round" />
        <polyline ref={rl3} fill="none" stroke="rgba(8,18,12,0.95)"     strokeWidth="5"  strokeLinecap="round" strokeLinejoin="round" />
        <polyline ref={rl4} fill="none" stroke="rgba(197,168,130,0.6)"  strokeWidth="1"  strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 12" />
      </svg>

      {/* Fixed tire marks layer */}
      <svg ref={tireMarksSvgRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }} />

      {/* Fixed car — opacity:0 until first tick to avoid flash at (0,0) */}
      <div ref={carRef} style={{ position: 'fixed', top: 0, left: 0, width: '44px', height: '22px', marginLeft: '-22px', marginTop: '-11px', willChange: 'transform', pointerEvents: 'none', zIndex: 12, opacity: 0 }}>
        <div ref={carInnerRef} style={{ width: '100%', height: '100%', transformOrigin: '50% 50%' }}>
          {/* Ferrari F40 — top-down view, front = right (+x) */}
          <svg viewBox="0 0 44 22" width="44" height="22" style={{ display: 'block', overflow: 'visible' }}>
            {/* Shadow */}
            <ellipse cx="22" cy="14" rx="21" ry="8.5" fill="rgba(0,0,0,0.45)" />

            {/* Rear wheels — very wide track */}
            <rect x="4"    y="-0.5" width="7"   height="8.5" rx="1.5" fill="#111" />
            <rect x="4"    y="14"   width="7"   height="8.5" rx="1.5" fill="#111" />
            {/* Front wheels */}
            <rect x="36.5" y="0.5"  width="5.5" height="6.5" rx="1.5" fill="#111" />
            <rect x="36.5" y="15"   width="5.5" height="6.5" rx="1.5" fill="#111" />

            {/* Body — wide rear haunches, narrow wedge nose */}
            <path d="M43,11 C42,8 39,5.5 36,4.5 C31,3.5 26,3.5 20,4 C14,4.5 10.5,3.5 7,3 C5.2,2.8 4.5,4 4.5,6 L4.5,16 C4.5,18 5.2,19.2 7,19 C10.5,18.5 14,17.5 20,18 C26,18.5 31,18.5 36,17.5 C39,16.5 42,14 43,11Z" fill="#CC0000" />

            {/* Body crease lines */}
            <path d="M36,4.5 C28,5 20,5.5 12,5 C8,4.8 5.5,5.2 4.5,6"    fill="none" stroke="rgba(255,80,80,0.18)" strokeWidth="0.8" />
            <path d="M36,17.5 C28,17 20,16.5 12,17 C8,17.2 5.5,16.8 4.5,16" fill="none" stroke="rgba(255,80,80,0.18)" strokeWidth="0.8" />

            {/* Twin NACA scoops — feeds the twin turbos, signature F40 detail */}
            <rect x="12.5" y="3.5" width="4.5" height="2.5" rx="0.8" fill="rgba(0,0,0,0.55)" />
            <rect x="12.5" y="16"  width="4.5" height="2.5" rx="0.8" fill="rgba(0,0,0,0.55)" />

            {/* Windshield — steeply raked */}
            <path d="M35,5.5 C38,7.5 39,9 39,11 C39,13 38,14.5 35,16.5 L29,15.5 L29,6.5Z" fill="rgba(130,185,210,0.42)" stroke="rgba(200,175,135,0.28)" strokeWidth="0.5" />

            {/* Cabin roof */}
            <path d="M29,6.5 L35,5.5 L35,16.5 L29,15.5 L20,15 L20,7Z" fill="rgba(70,0,0,0.5)" />

            {/* Rear window */}
            <path d="M20,7 L20,15 L15.5,14.5 L15.5,7.5Z" fill="rgba(130,185,210,0.2)" stroke="rgba(200,175,135,0.15)" strokeWidth="0.4" />

            {/* Tail lights — positioned in front of wing blade */}
            <rect x="5.5" y="5.5" width="2" height="3.5" rx="0.5" fill="rgba(220,55,55,0.95)" />
            <rect x="5.5" y="13"  width="2" height="3.5" rx="0.5" fill="rgba(220,55,55,0.95)" />
            <rect x="5"   y="9.5" width="2" height="3"   rx="0.5" fill="rgba(185,40,40,0.75)" />

            {/* Rear wing — wider than body, F40's defining feature */}
            {/* Main blade */}
            <rect x="1.5" y="-3"   width="3.5" height="28" rx="1"   fill="#1c1c1c" />
            {/* End caps */}
            <rect x="1.5" y="-3.5" width="5.5" height="4"  rx="0.8" fill="#222" />
            <rect x="1.5" y="21.5" width="5.5" height="4"  rx="0.8" fill="#222" />
            {/* Support struts connecting blade to body */}
            <rect x="4"   y="3.5"  width="5"   height="1.5" rx="0.5" fill="#181818" />
            <rect x="4"   y="17"   width="5"   height="1.5" rx="0.5" fill="#181818" />

            {/* Pop-up headlights — rectangular, flush, F40 signature */}
            <rect x="38.5" y="1"  width="4.5" height="5" rx="1" fill="rgba(255,250,195,0.9)" stroke="rgba(80,60,0,0.3)" strokeWidth="0.3" />
            <rect x="38.5" y="16" width="4.5" height="5" rx="1" fill="rgba(255,250,195,0.9)" stroke="rgba(80,60,0,0.3)" strokeWidth="0.3" />
          </svg>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ paddingTop: `${NAV_H}px` }}>

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
