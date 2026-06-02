'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const DONUT_SPEED   = 4500
const TIRE_INTERVAL = 90
const REAR_TYRES    = [{ lx: -16.8, ly: -6.9 }, { lx: -16.8, ly: 6.9 }]
const FRONT_AXLE    = 17

// Dual-angle drift constants
const MOVE_K   = 0.14   // how fast movement angle tracks cursor direction
const BODY_K   = 0.07   // how fast body follows movement (lower = more drift)
const MAX_SLIP = 32     // max degrees of slip angle before clamping

export default function TestPage() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  )

  const carRef         = useRef(null)
  const carInnerRef    = useRef(null)
  const frontWheelsRef = useRef(null)   // steerable front axle group
  const tireMarksSvg   = useRef(null)
  const beam1Ref       = useRef(null)   // headlight beam top
  const beam2Ref       = useRef(null)   // headlight beam bottom
  const cursorDotRef   = useRef(null)
  const rafRef         = useRef(null)
  const donutRafRef    = useRef(null)
  const stopTimer      = useRef(null)
  const tireInterval   = useRef(null)
  const donutStopTimer = useRef(null)
  const isDonuting     = useRef(false)
  const lastX          = useRef(0)
  const lastY          = useRef(0)
  const lastAngle      = useRef(0)
  const donutStart     = useRef(0)
  const donutBaseAngle = useRef(0)
  const donutPivotX    = useRef(0)
  const donutPivotY    = useRef(0)
  const donutCarX      = useRef(0)
  const donutCarY      = useRef(0)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 768) return

    // ── Spring state (plain closure vars — zero React overhead) ───────────────
    let px = window.innerWidth / 2, py = window.innerHeight / 2  // cursor target
    let sx = px, sy = py   // smoothed (spring) position
    let ox = px, oy = py   // previous frame position (for velocity)
    let moveAngle = 0      // direction the car is actually moving (updates fast)
    let bodyAngle = 0      // where the body points (lags = visible drift)

    if (carRef.current) {
      carRef.current.style.transform = `translate(${sx}px,${sy}px)`
      carRef.current.style.opacity   = '1'
    }
    lastX.current = sx; lastY.current = sy; lastAngle.current = 0

    // ── Tire marks ────────────────────────────────────────────────────────────
    function dropMark() {
      const svg = tireMarksSvg.current; if (!svg) return
      const elapsed  = Date.now() - donutStart.current
      const spinRad  = -(elapsed / DONUT_SPEED) * Math.PI * 2
      const totalRad = donutBaseAngle.current + spinRad
      const ns = 'http://www.w3.org/2000/svg'
      REAR_TYRES.forEach(({ lx, ly }) => {
        const wx = donutCarX.current + lx * Math.cos(totalRad) - ly * Math.sin(totalRad)
        const wy = donutCarY.current + lx * Math.sin(totalRad) + ly * Math.cos(totalRad)
        const el = document.createElementNS(ns, 'ellipse')
        el.setAttribute('cx', wx.toFixed(1)); el.setAttribute('cy', wy.toFixed(1))
        el.setAttribute('rx', '3.5');         el.setAttribute('ry', '1.8')
        el.setAttribute('transform', `rotate(${(totalRad * 180/Math.PI + 90).toFixed(1)} ${wx.toFixed(1)} ${wy.toFixed(1)})`)
        el.setAttribute('fill', 'rgba(197,168,130,0.65)'); el.style.opacity = '1'
        svg.appendChild(el)
        requestAnimationFrame(() => { el.style.transition = 'opacity 2.5s ease-out'; el.style.opacity = '0' })
        setTimeout(() => el.remove(), 2600)
      })
    }

    // ── Donut ─────────────────────────────────────────────────────────────────
    function stopDonut() {
      if (!carRef.current || !carInnerRef.current) return
      isDonuting.current = false
      cancelAnimationFrame(donutRafRef.current)
      clearInterval(tireInterval.current); clearTimeout(donutStopTimer.current)
      // Re-anchor spring from donut landing position
      sx = donutCarX.current; sy = donutCarY.current; ox = sx; oy = sy
      bodyAngle = lastAngle.current; moveAngle = lastAngle.current
      lastX.current = sx; lastY.current = sy
      carRef.current.style.transform      = `translate(${sx}px,${sy}px)`
      carInnerRef.current.style.transform = `rotate(${bodyAngle}deg)`
    }

    function startDonut() {
      if (!carRef.current || !carInnerRef.current || isDonuting.current) return
      isDonuting.current = true; donutStart.current = Date.now()
      lastAngle.current      = bodyAngle
      const baseRad          = bodyAngle * Math.PI / 180
      donutBaseAngle.current = baseRad
      donutPivotX.current    = lastX.current + FRONT_AXLE * Math.cos(baseRad)
      donutPivotY.current    = lastY.current + FRONT_AXLE * Math.sin(baseRad)
      donutCarX.current      = lastX.current
      donutCarY.current      = lastY.current
      function spinFrame() {
        if (!isDonuting.current || !carRef.current || !carInnerRef.current) return
        const elapsed  = Date.now() - donutStart.current
        const spinRad  = -(elapsed / DONUT_SPEED) * Math.PI * 2
        const totalRad = baseRad + spinRad
        const cx = donutPivotX.current - FRONT_AXLE * Math.cos(totalRad)
        const cy = donutPivotY.current - FRONT_AXLE * Math.sin(totalRad)
        donutCarX.current = cx; donutCarY.current = cy
        carRef.current.style.transform      = `translate(${cx}px,${cy}px)`
        carInnerRef.current.style.transform = `rotate(${bodyAngle - (elapsed / DONUT_SPEED) * 360}deg)`
        donutRafRef.current = requestAnimationFrame(spinFrame)
      }
      donutRafRef.current    = requestAnimationFrame(spinFrame)
      tireInterval.current   = setInterval(dropMark, TIRE_INTERVAL)
      donutStopTimer.current = setTimeout(stopDonut, 30000)
    }

    // ── Main RAF loop ─────────────────────────────────────────────────────────
    function loop() {
      // 1. Speed-adaptive spring: tight when near cursor, heavy when far
      const dist = Math.sqrt((px - sx) * (px - sx) + (py - sy) * (py - sy))
      const s    = Math.min(0.16, 0.055 + dist * 0.00035)
      sx += (px - sx) * s
      sy += (py - sy) * s
      const vx = sx - ox, vy = sy - oy
      ox = sx; oy = sy
      const speed = Math.sqrt(vx * vx + vy * vy)

      // 2. Dual-angle: movement direction updates fast, body lags behind → drift
      if (speed > 0.07) {
        const raw      = Math.atan2(vy, vx) * 180 / Math.PI
        const moveDiff = ((raw - moveAngle) % 360 + 540) % 360 - 180
        moveAngle += moveDiff * MOVE_K
      }
      let bodyDiff = ((moveAngle - bodyAngle) % 360 + 540) % 360 - 180
      bodyDiff     = Math.max(-MAX_SLIP, Math.min(MAX_SLIP, bodyDiff))
      bodyAngle   += bodyDiff * (speed > 0.07 ? BODY_K : 0.05)

      // 3. Front wheel steering — driven by current slip angle
      const slip       = ((moveAngle - bodyAngle) % 360 + 540) % 360 - 180
      const steerAngle = Math.max(-28, Math.min(28, slip * 0.65))
      if (frontWheelsRef.current) {
        if (isDonuting.current) {
          frontWheelsRef.current.setAttribute('transform', 'rotate(0,49,13)')
        } else {
          frontWheelsRef.current.setAttribute('transform', `rotate(${steerAngle.toFixed(1)},49,13)`)
        }
      }

      // 4. Headlight beams — two triangular fans from each headlight
      if (!isDonuting.current && beam1Ref.current && beam2Ref.current) {
        const rad = bodyAngle * Math.PI / 180
        const cr  = Math.cos(rad), sr = Math.sin(rad)
        const pr  = -sr, ps = cr   // perpendicular unit vector
        const bLen = 240, bHW = 62
        // Headlight local positions (F40 SVG at 46×21, scaled from 56×26)
        const lights = [{ lx: 20, ly: -6.7 }, { lx: 20, ly: 6.7 }]
        const refs   = [beam1Ref, beam2Ref]
        lights.forEach(({ lx, ly }, i) => {
          const hx = sx + lx * cr - ly * sr
          const hy = sy + lx * sr + ly * cr
          const fx = hx + cr * bLen, fy = hy + sr * bLen
          refs[i].current.setAttribute('points',
            `${hx.toFixed(1)},${hy.toFixed(1)} ` +
            `${(fx + pr * bHW).toFixed(1)},${(fy + ps * bHW).toFixed(1)} ` +
            `${(fx - pr * bHW).toFixed(1)},${(fy - ps * bHW).toFixed(1)}`)
        })
      } else {
        beam1Ref.current?.setAttribute('points', '')
        beam2Ref.current?.setAttribute('points', '')
      }

      // 5. Write car to DOM (donut manages its own transforms)
      if (!isDonuting.current && carRef.current && carInnerRef.current) {
        lastX.current = sx; lastY.current = sy; lastAngle.current = bodyAngle
        carRef.current.style.transform      = `translate(${sx}px,${sy}px)`
        carInnerRef.current.style.transform = `rotate(${bodyAngle}deg)`
      }

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    // ── Input ─────────────────────────────────────────────────────────────────
    function onMouseMove(e) {
      px = e.clientX; py = e.clientY
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate(${e.clientX}px,${e.clientY}px)`
        cursorDotRef.current.style.opacity   = '1'
      }
      if (isDonuting.current) stopDonut()
      clearTimeout(stopTimer.current)
      stopTimer.current = setTimeout(startDonut, 800)
    }
    function onMouseLeave() {
      if (cursorDotRef.current) cursorDotRef.current.style.opacity = '0'
      clearTimeout(stopTimer.current)
      stopTimer.current = setTimeout(startDonut, 1200)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
    stopTimer.current = setTimeout(startDonut, 1500)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      clearTimeout(stopTimer.current); clearTimeout(donutStopTimer.current)
      clearInterval(tireInterval.current)
      cancelAnimationFrame(rafRef.current); cancelAnimationFrame(donutRafRef.current)
      if (tireMarksSvg.current) tireMarksSvg.current.innerHTML = ''
    }
  }, [])

  return (
    <div style={{ background: '#0F1E14', minHeight: '100vh', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Cursor target dot */}
      {!isMobile && (
        <div ref={cursorDotRef} style={{
          position: 'fixed', top: 0, left: 0,
          width: '5px', height: '5px', borderRadius: '50%',
          background: 'rgba(197,168,130,0.45)',
          border: '0.5px solid rgba(197,168,130,0.7)',
          marginLeft: '-2.5px', marginTop: '-2.5px',
          pointerEvents: 'none', zIndex: 20, opacity: 0, willChange: 'transform',
        }} />
      )}

      {/* Headlight beams — sit below car and tire marks */}
      {!isMobile && (
        <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
          <polygon ref={beam1Ref} fill="rgba(255,248,200,0.07)" />
          <polygon ref={beam2Ref} fill="rgba(255,248,200,0.07)" />
        </svg>
      )}

      {/* Tire marks */}
      <svg ref={tireMarksSvg} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 11 }} />

      {/* Car */}
      {!isMobile && (
        <div ref={carRef} style={{
          position: 'fixed', top: 0, left: 0,
          width: '46px', height: '21px',
          marginLeft: '-23px', marginTop: '-10.5px',
          willChange: 'transform', pointerEvents: 'none',
          zIndex: 12, opacity: 0, overflow: 'visible',
        }}>
          <div ref={carInnerRef} style={{ width: '100%', height: '100%', transformOrigin: '50% 50%', willChange: 'transform' }}>
            <svg viewBox="0 0 56 26" width="46" height="21" style={{ display: 'block', overflow: 'visible' }}>
              <ellipse cx="28" cy="18" rx="26" ry="10" fill="rgba(0,0,0,0.45)" />
              {/* Rear wheels — fixed */}
              <rect x="3"  y="-1"  width="9" height="11" rx="2" fill="#111" />
              <rect x="3"  y="16"  width="9" height="11" rx="2" fill="#111" />
              {/* Front wheels — steerable group, rotates around axle centre (49,13) */}
              <g ref={frontWheelsRef}>
                <rect x="45" y="0"   width="8" height="9"  rx="2" fill="#111" />
                <rect x="45" y="17"  width="8" height="9"  rx="2" fill="#111" />
              </g>
              <path d="M55,13 C53,9 49,6.5 46,5.5 C41,4.5 35,4.5 28,5 C21,5.5 14,3 8,1 C5,0.5 3,2 3,4.5 L3,21.5 C3,24 5,25.5 8,25 C14,23 21,20.5 28,21 C35,21.5 41,21.5 46,20.5 C49,19.5 53,17 55,13Z" fill="#CC0000" />
              <path d="M46,5.5 C38,6.2 30,6.8 22,7.2 C16,7.5 9,6.2 4.5,5.5"    fill="none" stroke="rgba(255,80,80,0.2)" strokeWidth="1" />
              <path d="M46,20.5 C38,19.8 30,19.2 22,18.8 C16,18.5 9,19.8 4.5,20.5" fill="none" stroke="rgba(255,80,80,0.2)" strokeWidth="1" />
              <path d="M43,7.5 C47,9.5 48,11 48,13 C48,15 47,16.5 43,18.5 L36,17.5 L36,8.5Z" fill="rgba(120,175,205,0.45)" stroke="rgba(200,175,135,0.3)" strokeWidth="0.6" />
              <path d="M36,8.5 L43,7.5 L43,18.5 L36,17.5 L24,17 L24,9Z" fill="rgba(55,0,0,0.55)" />
              <path d="M24,9 L24,17 L18,16.5 L18,9.5Z" fill="rgba(120,175,205,0.22)" stroke="rgba(200,175,135,0.15)" strokeWidth="0.5" />
              <path d="M19,5.5 C22,5 26,5 29,5.5 L29,8.5 C26,9 22,9 19,8.5Z"       fill="rgba(0,0,0,0.6)" />
              <path d="M19,17.5 C22,17 26,17 29,17.5 L29,20.5 C26,21 22,21 19,20.5Z" fill="rgba(0,0,0,0.6)" />
              <rect x="8" y="8.2"  width="8" height="0.9" rx="0.3" fill="rgba(0,0,0,0.28)" />
              <rect x="8" y="10"   width="8" height="0.9" rx="0.3" fill="rgba(0,0,0,0.28)" />
              <rect x="8" y="11.8" width="8" height="0.9" rx="0.3" fill="rgba(0,0,0,0.28)" />
              <rect x="8" y="13.6" width="8" height="0.9" rx="0.3" fill="rgba(0,0,0,0.28)" />
              <rect x="8" y="15.4" width="8" height="0.9" rx="0.3" fill="rgba(0,0,0,0.28)" />
              <rect x="8" y="17.2" width="8" height="0.9" rx="0.3" fill="rgba(0,0,0,0.28)" />
              <rect x="5"   y="7"  width="3" height="5"   rx="0.8" fill="rgba(220,55,55,0.95)" />
              <rect x="5"   y="14" width="3" height="5"   rx="0.8" fill="rgba(220,55,55,0.95)" />
              <rect x="4.5" y="12" width="3" height="2.5" rx="0.6" fill="rgba(185,40,40,0.75)" />
              <rect x="0.5" y="-6"   width="4.5" height="38" rx="1.5" fill="#1c1c1c" />
              <rect x="0.5" y="-7"   width="8"   height="5.5" rx="1.2" fill="#242424" />
              <rect x="0.5" y="27.5" width="8"   height="5.5" rx="1.2" fill="#242424" />
              <rect x="3.5" y="4.5"  width="9"   height="2.5" rx="0.8" fill="#181818" />
              <rect x="3.5" y="19"   width="9"   height="2.5" rx="0.8" fill="#181818" />
              <rect x="49" y="1"    width="6.5" height="7.5" rx="1.5" fill="rgba(255,250,195,0.9)" stroke="rgba(80,60,0,0.3)" strokeWidth="0.4" />
              <rect x="49" y="17.5" width="6.5" height="7.5" rx="1.5" fill="rgba(255,250,195,0.9)" stroke="rgba(80,60,0,0.3)" strokeWidth="0.4" />
            </svg>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.5rem', height: '68px', background: 'rgba(10,20,13,0.9)', backdropFilter: 'blur(12px)', borderBottom: '0.5px solid rgba(197,168,130,0.12)' }}>
        <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.1rem', fontWeight: '300', color: '#F5F1EC', letterSpacing: '0.04em' }}>Canvas Routes</span>
        <span style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.35)' }}>
          {isMobile ? 'Desktop only' : 'Move your cursor — stop to donut'}
        </span>
        <Link href="/" style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)', textDecoration: 'none' }}>← Back</Link>
      </nav>

      {/* Content */}
      <div style={{ paddingTop: '68px' }}>
        <section style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 3rem' }}>
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
        </section>

        <section style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 3rem' }}>
          <div style={{ maxWidth: isMobile ? '100%' : '48%' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1rem' }}>The Route</div>
            <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>Backroads.<br />No shortcuts.</h2>
            <p style={{ fontSize: '14px', color: 'rgba(245,241,236,0.45)', lineHeight: 1.9, maxWidth: '320px' }}>
              We plan every route to avoid highways. Winding two-lane roads, elevation changes and long sweeping corners.
            </p>
          </div>
        </section>

        <section style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 3rem' }}>
          <div style={{ maxWidth: isMobile ? '100%' : '48%' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1rem' }}>The Experience</div>
            <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>Every detail<br />is handled.</h2>
            <p style={{ fontSize: '14px', color: 'rgba(245,241,236,0.45)', lineHeight: 1.9, maxWidth: '320px' }}>
              Breakfast before departure. Stops along the route. Group lunch, farewell drinks, and your car photographed on the road.
            </p>
          </div>
        </section>

        <section style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 3rem' }}>
          <div style={{ maxWidth: isMobile ? '100%' : '48%' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1rem' }}>Membership</div>
            <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>Your seat<br />is held.</h2>
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
