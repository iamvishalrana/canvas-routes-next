'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ── Cursor car constants ──────────────────────────────────────────────────────
const DONUT_SPEED   = 4500
const TIRE_INTERVAL = 90
const REAR_TYRES    = [{ lx: -16.8, ly: -6.9 }, { lx: -16.8, ly: 6.9 }]
const FRONT_AXLE    = 17
const SPRING        = 0.09
const ANGLE_K       = 0.13

// ── Burnout car constants ─────────────────────────────────────────────────────
const BT_FRONT      = 11
const BT_REAR_TYRES = [{ lx: -11, ly: -4.5 }, { lx: -11, ly: 4.5 }]

// ── "Membership" canonical path (500 × 75 space, baseline y = 70) ────────────
// Each cluster of points is one letter. Car traces this entire path continuously.
const RAW_PATH = [
  // M
  [0,70],[2,12],[30,40],[58,12],[60,70],
  // connector
  [65,70],
  // e
  [67,46],[70,20],[88,14],[105,25],[106,44],[68,44],[66,32],[79,13],[103,12],[107,26],[108,70],
  // connector
  [112,70],
  // m
  [113,36],[120,10],[130,36],[130,10],[142,36],[142,10],[153,36],[155,70],
  // connector
  [159,70],
  // b
  [160,8],[162,62],[165,46],[178,36],[196,38],[203,50],[204,64],[204,70],
  // connector
  [208,70],
  // e
  [210,46],[213,20],[231,14],[249,25],[250,44],[211,44],[209,32],[222,13],[247,12],[251,26],[252,70],
  // connector
  [256,70],
  // r
  [258,36],[261,12],[274,10],[288,22],[290,38],[291,70],
  // connector
  [295,70],
  // s
  [296,56],[299,40],[312,32],[330,40],[332,52],[320,57],[299,61],[296,67],[298,70],[334,70],
  // connector
  [338,70],
  // h
  [340,8],[342,42],[346,24],[360,14],[375,19],[381,36],[382,70],
  // connector
  [386,70],
  // i
  [388,32],[390,10],[392,32],[394,70],
  // connector
  [398,70],
  // p (with descender)
  [400,30],[402,8],[404,50],[407,76],[418,83],[432,76],[440,62],[440,50],[421,46],[404,52],[406,70],[448,70],
]

// ── Catmull-Rom spline interpolation ─────────────────────────────────────────
function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t
  return [
    0.5 * ((2*p1[0]) + (-p0[0]+p2[0])*t + (2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2 + (-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
    0.5 * ((2*p1[1]) + (-p0[1]+p2[1])*t + (2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2 + (-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3),
  ]
}

// Build a dense array of evenly-spaced points along the Catmull-Rom spline
function buildSpline(pts, density = 4) {
  const result = []
  const n = pts.length
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[Math.min(n - 1, i + 1)]
    const p3 = pts[Math.min(n - 1, i + 2)]
    for (let j = 0; j < density; j++) {
      result.push(catmullRom(p0, p1, p2, p3, j / density))
    }
  }
  result.push(pts[n - 1])
  return result
}

// Scale + offset the raw path to fit the viewport
function buildWorldPath(vw, vh) {
  const scale = Math.min((vw * 0.68) / 500, 1.8)
  const wordW = 500 * scale
  const wordH = 83 * scale // includes descender
  const ox = (vw - wordW) / 2
  const oy = vh / 2 - (70 * scale) / 2  // center on baseline midpoint
  return buildSpline(RAW_PATH.map(([x, y]) => [ox + x * scale, oy + y * scale]))
}

export default function TestPage() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  )
  const [btPhase, setBtPhase] = useState('idle') // idle | driving-in | writing | driving-out | done

  // ── Cursor car refs ───────────────────────────────────────────────────────
  const carRef         = useRef(null)
  const carInnerRef    = useRef(null)
  const tireMarksSvg   = useRef(null)
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
  const headlight1Ref  = useRef(null)
  const headlight2Ref  = useRef(null)
  const flashTimer     = useRef(null)

  // ── Burnout animation refs ────────────────────────────────────────────────
  const btCarRef       = useRef(null)
  const btCarInnerRef  = useRef(null)
  const btMarksSvg     = useRef(null)
  const btRafRef       = useRef(null)
  const btReplayRef    = useRef(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Burnout animation ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 768) return

    const vw = window.innerWidth
    const vh = window.innerHeight
    const worldPath = buildWorldPath(vw, vh)

    // Persistent tire marks (don't fade during writing)
    const droppedMarks = []

    function dropBtMark(cx, cy, angleRad) {
      const svg = btMarksSvg.current; if (!svg) return
      const ns = 'http://www.w3.org/2000/svg'
      BT_REAR_TYRES.forEach(({ lx, ly }) => {
        const wx = cx + lx * Math.cos(angleRad) - ly * Math.sin(angleRad)
        const wy = cy + lx * Math.sin(angleRad) + ly * Math.cos(angleRad)
        const el = document.createElementNS(ns, 'ellipse')
        el.setAttribute('cx', wx.toFixed(1))
        el.setAttribute('cy', wy.toFixed(1))
        el.setAttribute('rx', '2.2')
        el.setAttribute('ry', '1.1')
        const td = (angleRad * 180 / Math.PI) + 90
        el.setAttribute('transform', `rotate(${td.toFixed(1)} ${wx.toFixed(1)} ${wy.toFixed(1)})`)
        el.setAttribute('fill', 'rgba(197,168,130,0.85)')
        svg.appendChild(el)
        droppedMarks.push(el)
      })
    }

    function fadeAllMarks() {
      droppedMarks.forEach(el => {
        el.style.transition = 'opacity 2.5s ease-out'
        el.style.opacity = '0'
        setTimeout(() => el.remove(), 2600)
      })
      droppedMarks.length = 0
    }

    function setCarPos(x, y, angleDeg) {
      if (btCarRef.current) btCarRef.current.style.transform = `translate(${x}px,${y}px)`
      if (btCarInnerRef.current) btCarInnerRef.current.style.transform = `rotate(${angleDeg}deg)`
    }

    function runAnimation() {
      if (!btCarRef.current) return
      btCarRef.current.style.opacity = '1'

      // Phase 1: drive in from left to first waypoint
      const firstPt   = worldPath[0]
      const startX    = -60
      const startY    = firstPt[1]
      let cx = startX, cy = startY

      setBtPhase('driving-in')

      function driveIn() {
        const dx   = firstPt[0] - cx
        const dy   = firstPt[1] - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 4) {
          // Start writing phase
          startWriting()
          return
        }
        const speed = 5
        cx += (dx / dist) * speed
        cy += (dy / dist) * speed
        const angle = Math.atan2(dy, dx) * 180 / Math.PI
        setCarPos(cx, cy, angle)
        btRafRef.current = requestAnimationFrame(driveIn)
      }
      btRafRef.current = requestAnimationFrame(driveIn)

      // Phase 2: follow the word path, dropping tire marks
      let pathIdx = 0
      function startWriting() {
        setBtPhase('writing')
        cx = worldPath[0][0]
        cy = worldPath[0][1]

        function writeFrame() {
          if (pathIdx >= worldPath.length - 1) {
            startDriveOut()
            return
          }
          const target = worldPath[pathIdx + 1]
          const dx   = target[0] - cx
          const dy   = target[1] - cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          const speed = 2.2

          if (dist < speed) {
            pathIdx++
          } else {
            cx += (dx / dist) * speed
            cy += (dy / dist) * speed
          }

          const angleRad = Math.atan2(dy, dx)
          setCarPos(cx, cy, angleRad * 180 / Math.PI)
          dropBtMark(cx, cy, angleRad)
          btRafRef.current = requestAnimationFrame(writeFrame)
        }
        btRafRef.current = requestAnimationFrame(writeFrame)
      }

      // Phase 3: drive off to the right
      function startDriveOut() {
        setBtPhase('driving-out')
        const endX = vw + 80
        let speed  = 3

        function driveOut() {
          cx    += speed
          speed  = Math.min(speed + 0.18, 10) // accelerate
          const angle = 0
          setCarPos(cx, cy, angle)
          if (cx < endX) {
            btRafRef.current = requestAnimationFrame(driveOut)
          } else {
            btCarRef.current.style.opacity = '0'
            fadeAllMarks()
            setBtPhase('done')
          }
        }
        btRafRef.current = requestAnimationFrame(driveOut)
      }
    }

    // Auto-start on load
    const startTimer = setTimeout(runAnimation, 800)

    return () => {
      clearTimeout(startTimer)
      cancelAnimationFrame(btRafRef.current)
      if (btMarksSvg.current) btMarksSvg.current.innerHTML = ''
    }
  }, [])

  // ── Cursor car effect (unchanged) ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 768) return

    let px = window.innerWidth / 2,  py = window.innerHeight / 2
    let sx = px, sy = py
    let ox = px, oy = py
    let angle = 0

    if (carRef.current) {
      carRef.current.style.transform = `translate(${sx}px,${sy}px)`
      carRef.current.style.opacity   = '1'
    }
    lastX.current = sx; lastY.current = sy; lastAngle.current = angle

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
        el.setAttribute('fill', 'rgba(197,168,130,0.65)')
        el.style.opacity = '1'
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
      donutCarX.current      = lastX.current
      donutCarY.current      = lastY.current
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
      sx += (px - sx) * SPRING
      sy += (py - sy) * SPRING
      const vx = sx - ox, vy = sy - oy
      ox = sx; oy = sy
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

    function flashHeadlights() {
      const h1 = headlight1Ref.current, h2 = headlight2Ref.current
      if (!h1 || !h2) return
      const on  = 'rgba(255,250,195,0.9)', off = 'rgba(30,20,10,0.55)'
      h1.setAttribute('fill', off);  h2.setAttribute('fill', off)
      setTimeout(() => {
        h1.setAttribute('fill', on);  h2.setAttribute('fill', on)
        setTimeout(() => {
          h1.setAttribute('fill', off); h2.setAttribute('fill', off)
          setTimeout(() => { h1.setAttribute('fill', on); h2.setAttribute('fill', on) }, 130)
        }, 220)
      }, 130)
    }

    function onMouseMove(e) {
      px = e.clientX; py = e.clientY
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate(${e.clientX}px,${e.clientY}px)`
        cursorDotRef.current.style.opacity   = '1'
      }
      if (isDonuting.current) stopDonut()
      clearTimeout(stopTimer.current); clearTimeout(flashTimer.current)
      stopTimer.current  = setTimeout(startDonut, 3000)
      flashTimer.current = setTimeout(flashHeadlights, 49000)
    }

    function onMouseLeave() {
      if (cursorDotRef.current) cursorDotRef.current.style.opacity = '0'
      clearTimeout(stopTimer.current); clearTimeout(flashTimer.current)
      stopTimer.current = setTimeout(startDonut, 3000)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
    stopTimer.current = setTimeout(startDonut, 3000)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      clearTimeout(stopTimer.current); clearTimeout(donutStopTimer.current); clearTimeout(flashTimer.current)
      clearInterval(tireInterval.current)
      cancelAnimationFrame(rafRef.current); cancelAnimationFrame(donutRafRef.current)
      if (tireMarksSvg.current) tireMarksSvg.current.innerHTML = ''
    }
  }, [])

  return (
    <div style={{ background: '#0F1E14', minHeight: '100vh', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Cursor dot */}
      {!isMobile && (
        <div ref={cursorDotRef} style={{
          position: 'fixed', top: 0, left: 0,
          width: '5px', height: '5px', borderRadius: '50%',
          background: 'rgba(197,168,130,0.45)', border: '0.5px solid rgba(197,168,130,0.65)',
          marginLeft: '-2.5px', marginTop: '-2.5px',
          pointerEvents: 'none', zIndex: 20, opacity: 0, willChange: 'transform',
        }} />
      )}

      {/* Cursor car tire marks */}
      <svg ref={tireMarksSvg} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 11 }} />

      {/* Cursor car */}
      {!isMobile && (
        <div ref={carRef} style={{
          position: 'fixed', top: 0, left: 0, width: '46px', height: '21px',
          marginLeft: '-23px', marginTop: '-10.5px',
          willChange: 'transform', pointerEvents: 'none', zIndex: 12, opacity: 0, overflow: 'visible',
        }}>
          <div ref={carInnerRef} style={{ width: '100%', height: '100%', transformOrigin: '50% 50%', willChange: 'transform' }}>
            <svg viewBox="0 0 56 26" width="46" height="21" style={{ display: 'block', overflow: 'visible' }}>
              <ellipse cx="28" cy="18" rx="26" ry="10" fill="rgba(0,0,0,0.45)" />
              <rect x="3"  y="-1"  width="9" height="11" rx="2" fill="#111" />
              <rect x="3"  y="16"  width="9" height="11" rx="2" fill="#111" />
              <rect x="45" y="0"   width="8" height="9"  rx="2" fill="#111" />
              <rect x="45" y="17"  width="8" height="9"  rx="2" fill="#111" />
              <path d="M55,13 C53,9 49,6.5 46,5.5 C41,4.5 35,4.5 28,5 C21,5.5 14,3 8,1 C5,0.5 3,2 3,4.5 L3,21.5 C3,24 5,25.5 8,25 C14,23 21,20.5 28,21 C35,21.5 41,21.5 46,20.5 C49,19.5 53,17 55,13Z" fill="#CC0000" />
              <path d="M43,7.5 C47,9.5 48,11 48,13 C48,15 47,16.5 43,18.5 L36,17.5 L36,8.5Z" fill="rgba(120,175,205,0.45)" stroke="rgba(200,175,135,0.3)" strokeWidth="0.6" />
              <path d="M36,8.5 L43,7.5 L43,18.5 L36,17.5 L24,17 L24,9Z" fill="rgba(55,0,0,0.55)" />
              <path d="M24,9 L24,17 L18,16.5 L18,9.5Z" fill="rgba(120,175,205,0.22)" />
              <rect x="5"   y="7"  width="3" height="5"   rx="0.8" fill="rgba(220,55,55,0.95)" />
              <rect x="5"   y="14" width="3" height="5"   rx="0.8" fill="rgba(220,55,55,0.95)" />
              <rect x="0.5" y="-6"   width="4.5" height="38" rx="1.5" fill="#1c1c1c" />
              <rect x="0.5" y="-7"   width="8"   height="5.5" rx="1.2" fill="#242424" />
              <rect x="0.5" y="27.5" width="8"   height="5.5" rx="1.2" fill="#242424" />
              <rect ref={headlight1Ref} x="49" y="1"    width="6.5" height="7.5" rx="1.5" fill="rgba(255,250,195,0.9)" stroke="rgba(80,60,0,0.3)" strokeWidth="0.4" />
              <rect ref={headlight2Ref} x="49" y="17.5" width="6.5" height="7.5" rx="1.5" fill="rgba(255,250,195,0.9)" stroke="rgba(80,60,0,0.3)" strokeWidth="0.4" />
            </svg>
          </div>
        </div>
      )}

      {/* ── BURNOUT TEXT SECTION ─────────────────────────────────────────────── */}
      <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>

        {/* Burnout tire marks (persistent until drive-out) */}
        <svg ref={btMarksSvg} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }} />

        {/* Burnout car (smaller, 30px wide) */}
        {!isMobile && (
          <div ref={btCarRef} style={{
            position: 'absolute', top: 0, left: 0,
            width: '30px', height: '14px',
            marginLeft: '-15px', marginTop: '-7px',
            willChange: 'transform', pointerEvents: 'none',
            zIndex: 3, opacity: 0, overflow: 'visible',
          }}>
            <div ref={btCarInnerRef} style={{ width: '100%', height: '100%', transformOrigin: '50% 50%', willChange: 'transform' }}>
              <svg viewBox="0 0 56 26" width="30" height="14" style={{ display: 'block', overflow: 'visible' }}>
                <ellipse cx="28" cy="18" rx="26" ry="10" fill="rgba(0,0,0,0.5)" />
                <rect x="3"  y="-1"  width="9" height="11" rx="2" fill="#111" />
                <rect x="3"  y="16"  width="9" height="11" rx="2" fill="#111" />
                <rect x="45" y="0"   width="8" height="9"  rx="2" fill="#111" />
                <rect x="45" y="17"  width="8" height="9"  rx="2" fill="#111" />
                <path d="M55,13 C53,9 49,6.5 46,5.5 C41,4.5 35,4.5 28,5 C21,5.5 14,3 8,1 C5,0.5 3,2 3,4.5 L3,21.5 C3,24 5,25.5 8,25 C14,23 21,20.5 28,21 C35,21.5 41,21.5 46,20.5 C49,19.5 53,17 55,13Z" fill="#c5a882" />
                <path d="M43,7.5 C47,9.5 48,11 48,13 C48,15 47,16.5 43,18.5 L36,17.5 L36,8.5Z" fill="rgba(120,175,205,0.45)" />
                <path d="M36,8.5 L43,7.5 L43,18.5 L36,17.5 L24,17 L24,9Z" fill="rgba(80,50,0,0.6)" />
                <rect x="5"   y="7"  width="3" height="5" rx="0.8" fill="rgba(220,190,100,0.95)" />
                <rect x="5"   y="14" width="3" height="5" rx="0.8" fill="rgba(220,190,100,0.95)" />
                <rect x="0.5" y="-6"   width="4.5" height="38" rx="1.5" fill="#1c1c1c" />
                <rect x="49" y="1"    width="6.5" height="7.5" rx="1.5" fill="rgba(255,250,195,0.9)" />
                <rect x="49" y="17.5" width="6.5" height="7.5" rx="1.5" fill="rgba(255,250,195,0.9)" />
              </svg>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.5rem', height: '68px', background: 'rgba(10,20,13,0.85)', backdropFilter: 'blur(12px)', borderBottom: '0.5px solid rgba(197,168,130,0.12)' }}>
          <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.1rem', fontWeight: '300', color: '#F5F1EC', letterSpacing: '0.04em' }}>Canvas Routes</span>
          <span style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.35)' }}>
            {isMobile ? 'Desktop only' : btPhase === 'done' ? 'Move cursor · stop to donut' : 'Burnout text demo'}
          </span>
          <Link href="/" style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)', textDecoration: 'none' }}>← Back</Link>
        </nav>

        {/* Phase label */}
        {!isMobile && btPhase !== 'idle' && btPhase !== 'done' && (
          <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10, fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.4)' }}>
            {{ 'driving-in': 'Entering…', writing: 'Writing…', 'driving-out': 'Leaving…' }[btPhase]}
          </div>
        )}
      </div>

      {/* Scrollable content below */}
      <div>
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
            <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>
              Backroads.<br />No shortcuts.
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(245,241,236,0.45)', lineHeight: 1.9, maxWidth: '320px' }}>
              We plan every route to avoid highways. Winding two-lane roads, elevation changes and long sweeping corners.
            </p>
          </div>
        </section>

        <section style={{ background: '#F5F1EC', padding: '6rem 1.5rem', textAlign: 'center' }}>
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>You made it</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.1, marginBottom: '1.25rem' }}>Normal content lives here.</div>
            <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '0 auto 1.5rem' }} />
            <Link href="/" style={{ display: 'inline-block', padding: '0.8rem 2rem', background: '#0F1E14', color: '#F5F1EC', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', textDecoration: 'none' }}>Back to homepage</Link>
          </div>
        </section>
      </div>

    </div>
  )
}
