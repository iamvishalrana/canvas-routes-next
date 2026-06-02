'use client'
import { useEffect, useRef, useState } from 'react'

const DONUT_SPEED   = 4500
const TIRE_INTERVAL = 90
const REAR_TYRES    = [{ lx: -16.8, ly: -6.9 }, { lx: -16.8, ly: 6.9 }]
const FRONT_AXLE    = 17
const SPRING        = 0.09
const ANGLE_K       = 0.13

export default function MembersCar() {
  const [show, setShow] = useState(false)

  const carRef         = useRef(null)
  const carInnerRef    = useRef(null)
  const tireMarksSvg   = useRef(null)
  const cursorDotRef   = useRef(null)
  const headlight1Ref  = useRef(null)
  const headlight2Ref  = useRef(null)
  const beam1Ref       = useRef(null)
  const beam2Ref       = useRef(null)
  const rafRef         = useRef(null)
  const donutRafRef    = useRef(null)
  const stopTimer      = useRef(null)
  const tireInterval   = useRef(null)
  const donutStopTimer = useRef(null)
  const flashTimer     = useRef(null)
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
    const check = () => setShow(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!show) return

    let px = window.innerWidth / 2, py = window.innerHeight / 2
    let sx = px, sy = py, ox = px, oy = py
    let angle = 0

    if (carRef.current) {
      carRef.current.style.transform = `translate(${sx}px,${sy}px)`
      carRef.current.style.opacity   = '1'
    }
    lastX.current = sx; lastY.current = sy; lastAngle.current = 0

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
        el.setAttribute('fill', 'rgba(0,0,0,0.42)'); el.style.opacity = '1'
        svg.appendChild(el)
        requestAnimationFrame(() => { el.style.transition = 'opacity 2.5s ease-out'; el.style.opacity = '0' })
        setTimeout(() => el.remove(), 2600)
      })
    }

    function stopDonut() {
      if (!carRef.current || !carInnerRef.current) return
      isDonuting.current = false
      cancelAnimationFrame(donutRafRef.current)
      clearInterval(tireInterval.current); clearTimeout(donutStopTimer.current)
      sx = donutCarX.current; sy = donutCarY.current; ox = sx; oy = sy
      lastX.current = sx; lastY.current = sy
      carRef.current.style.transform      = `translate(${sx}px,${sy}px)`
      carInnerRef.current.style.transform = `rotate(${angle}deg)`
    }

    function startDonut() {
      if (!carRef.current || !carInnerRef.current || isDonuting.current) return
      isDonuting.current = true; donutStart.current = Date.now()
      const baseAngleRad     = lastAngle.current * Math.PI / 180
      donutBaseAngle.current = baseAngleRad
      donutPivotX.current    = lastX.current + FRONT_AXLE * Math.cos(baseAngleRad)
      donutPivotY.current    = lastY.current + FRONT_AXLE * Math.sin(baseAngleRad)
      donutCarX.current      = lastX.current; donutCarY.current = lastY.current
      function spinFrame() {
        if (!isDonuting.current || !carRef.current || !carInnerRef.current) return
        const elapsed  = Date.now() - donutStart.current
        const spinRad  = -(elapsed / DONUT_SPEED) * Math.PI * 2
        const totalRad = baseAngleRad + spinRad
        const cx = donutPivotX.current - FRONT_AXLE * Math.cos(totalRad)
        const cy = donutPivotY.current - FRONT_AXLE * Math.sin(totalRad)
        donutCarX.current = cx; donutCarY.current = cy
        carRef.current.style.transform      = `translate(${cx}px,${cy}px)`
        carInnerRef.current.style.transform = `rotate(${lastAngle.current - (elapsed/DONUT_SPEED)*360}deg)`
        donutRafRef.current = requestAnimationFrame(spinFrame)
      }
      donutRafRef.current    = requestAnimationFrame(spinFrame)
      tireInterval.current   = setInterval(dropMark, TIRE_INTERVAL)
      donutStopTimer.current = setTimeout(stopDonut, 30000)
    }

    function loop() {
      sx += (px - sx) * SPRING; sy += (py - sy) * SPRING
      const vx = sx - ox, vy = sy - oy; ox = sx; oy = sy
      const speed = Math.sqrt(vx * vx + vy * vy)
      if (speed > 0.07) {
        const raw  = Math.atan2(vy, vx) * 180 / Math.PI
        const diff = ((raw - angle) % 360 + 540) % 360 - 180
        angle += diff * ANGLE_K
      }
      if (!isDonuting.current && carRef.current && carInnerRef.current) {
        lastX.current = sx; lastY.current = sy; lastAngle.current = angle
        carRef.current.style.transform      = `translate(${sx}px,${sy}px)`
        carInnerRef.current.style.transform = `rotate(${angle}deg)`
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    // ── 49s headlight flash with beam glow ───────────────────────────────────
    function flashHeadlights() {
      const h1 = headlight1Ref.current, h2 = headlight2Ref.current
      const b1 = beam1Ref.current,      b2 = beam2Ref.current
      if (!h1 || !h2) return
      const normal = 'rgba(255,250,195,0.9)'
      const bright = 'rgba(255,255,215,1.0)'
      const dark   = 'rgba(18,12,4,0.65)'
      function beams(on) {
        const op = on ? '1' : '0'
        if (b1) b1.style.opacity = op
        if (b2) b2.style.opacity = op
      }
      // Off → bright+glow → off → bright+glow → back to normal
      h1.setAttribute('fill', dark);   h2.setAttribute('fill', dark);   beams(false)
      setTimeout(() => {
        h1.setAttribute('fill', bright); h2.setAttribute('fill', bright); beams(true)
        setTimeout(() => {
          h1.setAttribute('fill', dark);   h2.setAttribute('fill', dark);   beams(false)
          setTimeout(() => {
            h1.setAttribute('fill', bright); h2.setAttribute('fill', bright); beams(true)
            setTimeout(() => {
              h1.setAttribute('fill', normal); h2.setAttribute('fill', normal); beams(false)
            }, 220)
          }, 110)
        }, 220)
      }, 110)
    }

    function onMouseMove(e) {
      px = e.clientX; py = e.clientY
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate(${e.clientX}px,${e.clientY}px)`
        cursorDotRef.current.style.opacity   = '1'
      }
      if (isDonuting.current) stopDonut()
      clearTimeout(stopTimer.current); clearTimeout(flashTimer.current)
      stopTimer.current  = setTimeout(startDonut, 800)
      flashTimer.current = setTimeout(flashHeadlights, 49000)
    }
    function onMouseLeave() {
      if (cursorDotRef.current) cursorDotRef.current.style.opacity = '0'
      clearTimeout(stopTimer.current); clearTimeout(flashTimer.current)
      stopTimer.current = setTimeout(startDonut, 1200)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
    stopTimer.current = setTimeout(startDonut, 1500)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      clearTimeout(stopTimer.current); clearTimeout(donutStopTimer.current); clearTimeout(flashTimer.current)
      clearInterval(tireInterval.current)
      cancelAnimationFrame(rafRef.current); cancelAnimationFrame(donutRafRef.current)
      if (tireMarksSvg.current) tireMarksSvg.current.innerHTML = ''
    }
  }, [show])

  if (!show) return null

  return (
    <>
      {/* Cursor target dot */}
      <div ref={cursorDotRef} style={{
        position: 'fixed', top: 0, left: 0,
        width: '4px', height: '4px', borderRadius: '50%',
        background: 'rgba(0,0,0,0.18)',
        border: '0.5px solid rgba(0,0,0,0.28)',
        marginLeft: '-2px', marginTop: '-2px',
        pointerEvents: 'none', zIndex: 20, opacity: 0, willChange: 'transform',
      }} />

      {/* Tire marks */}
      <svg ref={tireMarksSvg} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 11 }} />

      {/* Car — overflow:visible so beam polygons can project forward */}
      <div ref={carRef} style={{
        position: 'fixed', top: 0, left: 0,
        width: '46px', height: '21px',
        marginLeft: '-23px', marginTop: '-10.5px',
        willChange: 'transform', pointerEvents: 'none',
        zIndex: 12, opacity: 0, overflow: 'visible',
      }}>
        <div ref={carInnerRef} style={{ width: '100%', height: '100%', transformOrigin: '50% 50%', willChange: 'transform' }}>
          <svg viewBox="0 0 56 26" width="46" height="21" style={{ display: 'block', overflow: 'visible' }}>

            {/* Headlight beams — live inside SVG so they rotate with the car.
                Hidden by default; flash function toggles opacity.
                Brand-gold fill is subtle but readable on the cream portal background. */}
            <polygon ref={beam1Ref}
              points="53,4.75 460,-115 460,52"
              fill="rgba(197,168,130,0.38)"
              style={{ opacity: 0, transition: 'opacity 0.04s' }} />
            <polygon ref={beam2Ref}
              points="53,21.25 460,-30 460,132"
              fill="rgba(197,168,130,0.38)"
              style={{ opacity: 0, transition: 'opacity 0.04s' }} />

            <ellipse cx="28" cy="18" rx="26" ry="10" fill="rgba(0,0,0,0.1)" />
            <rect x="3"  y="-1"  width="9" height="11" rx="2" fill="#111" />
            <rect x="3"  y="16"  width="9" height="11" rx="2" fill="#111" />
            <rect x="45" y="0"   width="8" height="9"  rx="2" fill="#111" />
            <rect x="45" y="17"  width="8" height="9"  rx="2" fill="#111" />
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
            <rect ref={headlight1Ref} x="49" y="1"    width="6.5" height="7.5" rx="1.5" fill="rgba(255,250,195,0.9)" stroke="rgba(80,60,0,0.3)" strokeWidth="0.4" />
            <rect ref={headlight2Ref} x="49" y="17.5" width="6.5" height="7.5" rx="1.5" fill="rgba(255,250,195,0.9)" stroke="rgba(80,60,0,0.3)" strokeWidth="0.4" />
          </svg>
        </div>
      </div>
    </>
  )
}
