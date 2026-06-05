'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const DONUT_SPEED   = 4500
const TIRE_INTERVAL = 90
const REAR_TYRES    = [{ lx: -16.8, ly: -6.9 }, { lx: -16.8, ly: 6.9 }]
const FRONT_AXLE    = 17
const SPRING        = 0.09
const ANGLE_K       = 0.13

const CHARS   = 'Membership'.split('')
const N_CHARS = CHARS.length // 10

export default function TestPage() {
  const [isMobile, setIsMobile]   = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [phase, setPhase]         = useState('idle')
  const [replayKey, setReplayKey] = useState(0)

  const animCarRef      = useRef(null)
  const animCarInnerRef = useRef(null)
  const animRafRef      = useRef(null)
  const paintRafRef     = useRef(null)
  const timersRef       = useRef([])
  const carXRef         = useRef(-120)

  const personRef = useRef(null)
  const armRef    = useRef(null)

  // Per-character SVG refs
  const charRefs = useRef(Array.from({ length: N_CHARS }, () => null))
  const clipRefs = useRef(Array.from({ length: N_CHARS }, () => null))

  const cursorCarRef      = useRef(null)
  const cursorCarInnerRef = useRef(null)
  const cursorRafRef      = useRef(null)
  const donutRafRef       = useRef(null)
  const tireMarksSvg      = useRef(null)
  const cursorDotRef      = useRef(null)
  const stopTimer         = useRef(null)
  const tireInterval      = useRef(null)
  const donutStopTimer    = useRef(null)
  const isDonuting        = useRef(false)
  const lastX             = useRef(0)
  const lastY             = useRef(0)
  const lastAngle         = useRef(0)
  const donutStart        = useRef(0)
  const donutBaseAngle    = useRef(0)
  const donutPivotX       = useRef(0)
  const donutPivotY       = useRef(0)
  const donutCarX         = useRef(0)
  const donutCarY         = useRef(0)
  const headlight1Ref     = useRef(null)
  const headlight2Ref     = useRef(null)
  const flashTimer        = useRef(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Main animation ────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 768) return

    const vw       = window.innerWidth
    const vh       = window.innerHeight
    const carStopX = Math.round(vw * 0.28)
    const carY     = Math.round(vh * 0.52)
    const doorX    = carStopX + 46
    const doorY    = carY - 28
    const personStandX = carStopX + 88
    // Font size matching clamp(3.5rem, 6.5vw, 7rem)
    const fontSize = Math.min(Math.max(Math.round(vw * 0.065), 56), 112)
    // Baseline: slightly above car center so ascenders + descenders fit in view
    const baseline = carY + Math.round(fontSize * 0.15)

    let cancelled = false
    function track(id) { timersRef.current.push(id); return id }

    // ── Reset DOM for replay ───────────────────────────────────────────────
    setPhase('idle')
    carXRef.current = -120

    if (animCarRef.current) {
      animCarRef.current.style.transition = 'none'
      animCarRef.current.style.transform  = `translate(-120px, ${carY}px)`
      animCarRef.current.style.opacity    = '0'
    }
    if (personRef.current) {
      personRef.current.style.transition = 'none'
      personRef.current.style.opacity    = '0'
      personRef.current.style.transform  = `translate(${doorX}px, ${doorY}px)`
    }
    if (armRef.current) armRef.current.classList.remove('arm-painting')

    // Hide all characters (collapse clip rects to zero height)
    clipRefs.current.forEach(el => { if (el) el.setAttribute('height', '0') })
    charRefs.current.forEach(el => {
      if (el) {
        el.setAttribute('font-size', String(fontSize))
        el.setAttribute('x', '0')
        el.setAttribute('y', '0')
      }
    })

    // ── Phase 1: car drives in ─────────────────────────────────────────────
    track(setTimeout(() => {
      if (cancelled) return
      if (animCarRef.current) {
        animCarRef.current.style.transition = ''
        animCarRef.current.style.opacity    = '1'
      }
      setPhase('driving-in')
      animRafRef.current = requestAnimationFrame(driveIn)
    }, 80))

    function driveIn() {
      if (cancelled) return
      const dx    = carStopX - carXRef.current
      const speed = Math.min(10, Math.abs(dx) * 0.12 + 3)
      if (Math.abs(dx) < 2) {
        carXRef.current = carStopX
        if (animCarRef.current) animCarRef.current.style.transform = `translate(${carStopX}px, ${carY}px)`
        onCarArrived()
        return
      }
      carXRef.current += Math.sign(dx) * speed
      if (animCarRef.current) animCarRef.current.style.transform = `translate(${carXRef.current}px, ${carY}px)`
      animRafRef.current = requestAnimationFrame(driveIn)
    }

    // ── Phase 2: person steps out ──────────────────────────────────────────
    function onCarArrived() {
      setPhase('person-exit')
      if (personRef.current) {
        personRef.current.style.transition = 'none'
        personRef.current.style.transform  = `translate(${doorX}px, ${doorY}px)`
        personRef.current.style.opacity    = '0'
      }
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (cancelled) return
        if (!personRef.current) return
        personRef.current.style.transition = 'transform 0.85s cubic-bezier(0.4,0,0.2,1), opacity 0.3s'
        personRef.current.style.opacity    = '1'
        personRef.current.style.transform  = `translate(${personStandX}px, ${doorY}px)`
        track(setTimeout(() => {
          if (cancelled) return
          setPhase('painting')
          if (armRef.current) armRef.current.classList.add('arm-painting')
          paintLetters()
        }, 950))
      }))
    }

    // ── Phase 3: paint each letter ─────────────────────────────────────────
    async function paintLetters() {
      try { await document.fonts.load(`700 ${fontSize}px Caveat`) } catch {}
      if (cancelled) return

      // Measure character widths via canvas (same font as SVG text)
      const mc  = document.createElement('canvas')
      const ctx = mc.getContext('2d')
      ctx.font  = `700 ${fontSize}px Caveat`

      let curX = personStandX + 22
      const charData = CHARS.map(char => {
        const w   = Math.ceil(ctx.measureText(char).width)
        const pos = { x: Math.round(curX), w }
        curX += w
        return pos
      })

      // Wire up each clip rect and char text position
      const clipTop = baseline - Math.round(fontSize * 1.15) // above cap height
      const clipH   = Math.round(fontSize * 1.55)            // cap + full descender

      charData.forEach(({ x, w }, i) => {
        const cr = clipRefs.current[i]
        if (cr) {
          cr.setAttribute('x',      String(x - 4))
          cr.setAttribute('y',      String(clipTop))
          cr.setAttribute('width',  String(w + 8))
          cr.setAttribute('height', '0')
        }
        const tr = charRefs.current[i]
        if (tr) {
          tr.setAttribute('x', String(x))
          tr.setAttribute('y', String(baseline))
        }
      })

      let idx = 0
      function paintNext() {
        if (cancelled || idx >= N_CHARS) {
          if (!cancelled) onPaintingDone()
          return
        }
        const { x, w } = charData[idx]

        // Move person to stand just left of this character (brush tip reaches the letter)
        if (personRef.current) {
          personRef.current.style.transition = 'transform 0.18s linear'
          personRef.current.style.transform  = `translate(${x - 14}px, ${doorY}px)`
        }

        const cr = clipRefs.current[idx]
        if (!cr) { idx++; paintNext(); return }

        // Duration scales with character width (wider = more strokes needed)
        const dur = Math.round(180 + w * 1.4)
        const t0  = performance.now()

        function revealFrame(now) {
          if (cancelled) return
          const p = Math.min((now - t0) / dur, 1)
          // Ease-out so it slows as the letter completes
          const eased = 1 - Math.pow(1 - p, 2)
          cr.setAttribute('height', String(Math.round(clipH * eased)))
          if (p < 1) {
            paintRafRef.current = requestAnimationFrame(revealFrame)
          } else {
            cr.setAttribute('height', String(clipH + 20)) // buffer for descenders
            idx++
            track(setTimeout(paintNext, 55))
          }
        }
        paintRafRef.current = requestAnimationFrame(revealFrame)
      }
      paintNext()
    }

    // ── Phase 4: person walks back ─────────────────────────────────────────
    function onPaintingDone() {
      if (armRef.current) armRef.current.classList.remove('arm-painting')
      setPhase('person-enter')
      if (personRef.current) {
        personRef.current.style.transition = 'transform 1s cubic-bezier(0.55,0,0.45,1), opacity 0.35s'
        personRef.current.style.transform  = `translate(${doorX}px, ${doorY}px)`
      }
      track(setTimeout(() => {
        if (cancelled) return
        if (personRef.current) personRef.current.style.opacity = '0'
        track(setTimeout(() => {
          if (cancelled) return
          setPhase('driving-out')
          startDriveOut()
        }, 320))
      }, 1020))
    }

    // ── Phase 5: car drives off ────────────────────────────────────────────
    function startDriveOut() {
      let speed = 3
      function driveOut() {
        if (cancelled) return
        carXRef.current += speed
        speed = Math.min(speed + 0.25, 14)
        if (animCarRef.current) animCarRef.current.style.transform = `translate(${carXRef.current}px, ${carY}px)`
        if (carXRef.current < vw + 160) {
          animRafRef.current = requestAnimationFrame(driveOut)
        } else {
          if (animCarRef.current) animCarRef.current.style.opacity = '0'
          setPhase('done')
        }
      }
      animRafRef.current = requestAnimationFrame(driveOut)
    }

    return () => {
      cancelled = true
      cancelAnimationFrame(animRafRef.current)
      cancelAnimationFrame(paintRafRef.current)
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      if (armRef.current) armRef.current.classList.remove('arm-painting')
    }
  }, [replayKey])

  // ── Cursor car ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 768) return

    let px = window.innerWidth / 2, py = window.innerHeight / 2
    let sx = px, sy = py, ox = px, oy = py, angle = 0

    if (cursorCarRef.current) {
      cursorCarRef.current.style.transform = `translate(${sx}px,${sy}px)`
      cursorCarRef.current.style.opacity   = '1'
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
      if (!cursorCarRef.current || !cursorCarInnerRef.current) return
      isDonuting.current = false
      cancelAnimationFrame(donutRafRef.current)
      clearInterval(tireInterval.current); clearTimeout(donutStopTimer.current)
      sx = donutCarX.current; sy = donutCarY.current; ox = sx; oy = sy
      lastX.current = sx; lastY.current = sy
      cursorCarRef.current.style.transform      = `translate(${sx}px,${sy}px)`
      cursorCarInnerRef.current.style.transform = `rotate(${angle}deg)`
    }

    function startDonut() {
      if (!cursorCarRef.current || !cursorCarInnerRef.current || isDonuting.current) return
      isDonuting.current = true; donutStart.current = Date.now()
      const baseAngleRad     = lastAngle.current * Math.PI / 180
      donutBaseAngle.current = baseAngleRad
      donutPivotX.current    = lastX.current + FRONT_AXLE * Math.cos(baseAngleRad)
      donutPivotY.current    = lastY.current + FRONT_AXLE * Math.sin(baseAngleRad)
      donutCarX.current      = lastX.current
      donutCarY.current      = lastY.current
      function spinFrame() {
        if (!isDonuting.current || !cursorCarRef.current || !cursorCarInnerRef.current) return
        const elapsed  = Date.now() - donutStart.current
        const spinRad  = -(elapsed / DONUT_SPEED) * Math.PI * 2
        const totalRad = baseAngleRad + spinRad
        const cx = donutPivotX.current - FRONT_AXLE * Math.cos(totalRad)
        const cy = donutPivotY.current - FRONT_AXLE * Math.sin(totalRad)
        donutCarX.current = cx; donutCarY.current = cy
        cursorCarRef.current.style.transform      = `translate(${cx}px,${cy}px)`
        cursorCarInnerRef.current.style.transform = `rotate(${lastAngle.current - (elapsed/DONUT_SPEED)*360}deg)`
        donutRafRef.current = requestAnimationFrame(spinFrame)
      }
      donutRafRef.current    = requestAnimationFrame(spinFrame)
      tireInterval.current   = setInterval(dropMark, TIRE_INTERVAL)
      donutStopTimer.current = setTimeout(stopDonut, 30000)
    }

    function loop() {
      sx += (px - sx) * SPRING; sy += (py - sy) * SPRING
      const vx = sx - ox, vy = sy - oy
      ox = sx; oy = sy
      const spd = Math.sqrt(vx * vx + vy * vy)
      if (spd > 0.07) {
        const raw  = Math.atan2(vy, vx) * 180 / Math.PI
        const diff = ((raw - angle) % 360 + 540) % 360 - 180
        angle += diff * ANGLE_K
      }
      if (!isDonuting.current && cursorCarRef.current && cursorCarInnerRef.current) {
        lastX.current = sx; lastY.current = sy; lastAngle.current = angle
        cursorCarRef.current.style.transform      = `translate(${sx}px,${sy}px)`
        cursorCarInnerRef.current.style.transform = `rotate(${angle}deg)`
      }
      cursorRafRef.current = requestAnimationFrame(loop)
    }
    cursorRafRef.current = requestAnimationFrame(loop)

    function flashHeadlights() {
      const h1 = headlight1Ref.current, h2 = headlight2Ref.current; if (!h1 || !h2) return
      const on = 'rgba(255,250,195,0.9)', off = 'rgba(30,20,10,0.55)'
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
      cancelAnimationFrame(cursorRafRef.current); cancelAnimationFrame(donutRafRef.current)
      if (tireMarksSvg.current) tireMarksSvg.current.innerHTML = ''
    }
  }, [])

  const phaseLabel = {
    idle: '—', 'driving-in': 'Arriving…', 'person-exit': 'Getting out…',
    painting: 'Painting…', 'person-enter': 'Getting back in…',
    'driving-out': 'Leaving…', done: 'Move cursor · stop to donut',
  }[phase]

  return (
    <div style={{ background: '#0F1E14', minHeight: '100vh', fontFamily: 'var(--font-inter),sans-serif' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap');

        @keyframes paintStroke {
          0%   { transform: rotate(-28deg); }
          20%  { transform: rotate(8deg);   }
          40%  { transform: rotate(-20deg); }
          60%  { transform: rotate(12deg);  }
          80%  { transform: rotate(-24deg); }
          100% { transform: rotate(-28deg); }
        }
        .arm-painting {
          transform-box:    fill-box;
          transform-origin: left bottom;
          animation: paintStroke 0.44s ease-in-out infinite;
        }
      `}</style>

      {/* Cursor dot */}
      {!isMobile && (
        <div ref={cursorDotRef} style={{
          position: 'fixed', top: 0, left: 0, width: '5px', height: '5px', borderRadius: '50%',
          background: 'rgba(197,168,130,0.45)', border: '0.5px solid rgba(197,168,130,0.65)',
          marginLeft: '-2.5px', marginTop: '-2.5px',
          pointerEvents: 'none', zIndex: 20, opacity: 0, willChange: 'transform',
        }} />
      )}

      <svg ref={tireMarksSvg} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 11 }} />

      {/* Cursor car */}
      {!isMobile && (
        <div ref={cursorCarRef} style={{
          position: 'fixed', top: 0, left: 0, width: '46px', height: '21px',
          marginLeft: '-23px', marginTop: '-10.5px',
          willChange: 'transform', pointerEvents: 'none', zIndex: 12, opacity: 0, overflow: 'visible',
        }}>
          <div ref={cursorCarInnerRef} style={{ width: '100%', height: '100%', transformOrigin: '50% 50%', willChange: 'transform' }}>
            <svg viewBox="0 0 56 26" width="46" height="21" style={{ display: 'block', overflow: 'visible' }}>
              <ellipse cx="28" cy="18" rx="26" ry="10" fill="rgba(0,0,0,0.45)" />
              <rect x="3" y="-1" width="9" height="11" rx="2" fill="#111" />
              <rect x="3" y="16" width="9" height="11" rx="2" fill="#111" />
              <rect x="45" y="0" width="8" height="9" rx="2" fill="#111" />
              <rect x="45" y="17" width="8" height="9" rx="2" fill="#111" />
              <path d="M55,13 C53,9 49,6.5 46,5.5 C41,4.5 35,4.5 28,5 C21,5.5 14,3 8,1 C5,0.5 3,2 3,4.5 L3,21.5 C3,24 5,25.5 8,25 C14,23 21,20.5 28,21 C35,21.5 41,21.5 46,20.5 C49,19.5 53,17 55,13Z" fill="#CC0000" />
              <path d="M43,7.5 C47,9.5 48,11 48,13 C48,15 47,16.5 43,18.5 L36,17.5 L36,8.5Z" fill="rgba(120,175,205,0.45)" stroke="rgba(200,175,135,0.3)" strokeWidth="0.6" />
              <path d="M36,8.5 L43,7.5 L43,18.5 L36,17.5 L24,17 L24,9Z" fill="rgba(55,0,0,0.55)" />
              <path d="M24,9 L24,17 L18,16.5 L18,9.5Z" fill="rgba(120,175,205,0.22)" />
              <rect x="5" y="7" width="3" height="5" rx="0.8" fill="rgba(220,55,55,0.95)" />
              <rect x="5" y="14" width="3" height="5" rx="0.8" fill="rgba(220,55,55,0.95)" />
              <rect x="0.5" y="-6" width="4.5" height="38" rx="1.5" fill="#1c1c1c" />
              <rect x="0.5" y="-7" width="8" height="5.5" rx="1.2" fill="#242424" />
              <rect x="0.5" y="27.5" width="8" height="5.5" rx="1.2" fill="#242424" />
              <rect ref={headlight1Ref} x="49" y="1" width="6.5" height="7.5" rx="1.5" fill="rgba(255,250,195,0.9)" stroke="rgba(80,60,0,0.3)" strokeWidth="0.4" />
              <rect ref={headlight2Ref} x="49" y="17.5" width="6.5" height="7.5" rx="1.5" fill="rgba(255,250,195,0.9)" stroke="rgba(80,60,0,0.3)" strokeWidth="0.4" />
            </svg>
          </div>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>

        <nav style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.5rem', height: '68px', background: 'rgba(10,20,13,0.85)', backdropFilter: 'blur(12px)', borderBottom: '0.5px solid rgba(197,168,130,0.12)' }}>
          <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.1rem', fontWeight: '300', color: '#F5F1EC', letterSpacing: '0.04em' }}>Canvas Routes</span>
          <span style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.35)' }}>
            {isMobile ? 'Desktop only' : phaseLabel}
          </span>
          <Link href="/" style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)', textDecoration: 'none' }}>← Back</Link>
        </nav>

        {/* ── Per-character SVG text with clip-based reveal ─────────────────── */}
        {!isMobile && (
          <svg
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              overflow: 'visible',
              pointerEvents: 'none',
              zIndex: 4,
            }}
          >
            <defs>
              {CHARS.map((_, i) => (
                <clipPath key={i} id={`cc-${i}`}>
                  {/* height starts at 0; JS grows it top-to-bottom as letter is painted */}
                  <rect
                    ref={el => { clipRefs.current[i] = el }}
                    x="0" y="0" width="200" height="0"
                  />
                </clipPath>
              ))}
            </defs>
            {CHARS.map((char, i) => (
              <g key={i} clipPath={`url(#cc-${i})`}>
                <text
                  ref={el => { charRefs.current[i] = el }}
                  x="0" y="0"
                  fontFamily="'Caveat', cursive"
                  fontWeight="700"
                  fontSize="100"
                  fill="#c5a882"
                >
                  {char}
                </text>
              </g>
            ))}
          </svg>
        )}

        {/* Mobile fallback */}
        {isMobile && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: "'Caveat', cursive",
            fontSize: '3.2rem', fontWeight: 700,
            color: '#c5a882', whiteSpace: 'nowrap', lineHeight: 1,
          }}>
            Membership
          </div>
        )}

        {/* Animation car */}
        {!isMobile && (
          <div ref={animCarRef} style={{
            position: 'absolute', top: 0, left: 0,
            width: '80px', height: '37px',
            marginLeft: '-40px', marginTop: '-18px',
            willChange: 'transform', pointerEvents: 'none',
            zIndex: 6, opacity: 0, overflow: 'visible',
          }}>
            <div ref={animCarInnerRef} style={{ width: '100%', height: '100%', transformOrigin: '50% 50%', willChange: 'transform' }}>
              <svg viewBox="0 0 56 26" width="80" height="37" style={{ display: 'block', overflow: 'visible' }}>
                <ellipse cx="28" cy="18" rx="26" ry="10" fill="rgba(0,0,0,0.5)" />
                <rect x="3" y="-1" width="9" height="11" rx="2" fill="#111" />
                <rect x="3" y="16" width="9" height="11" rx="2" fill="#111" />
                <rect x="45" y="0" width="8" height="9" rx="2" fill="#111" />
                <rect x="45" y="17" width="8" height="9" rx="2" fill="#111" />
                <path d="M55,13 C53,9 49,6.5 46,5.5 C41,4.5 35,4.5 28,5 C21,5.5 14,3 8,1 C5,0.5 3,2 3,4.5 L3,21.5 C3,24 5,25.5 8,25 C14,23 21,20.5 28,21 C35,21.5 41,21.5 46,20.5 C49,19.5 53,17 55,13Z" fill="#CC0000" />
                <path d="M43,7.5 C47,9.5 48,11 48,13 C48,15 47,16.5 43,18.5 L36,17.5 L36,8.5Z" fill="rgba(120,175,205,0.45)" />
                <path d="M36,8.5 L43,7.5 L43,18.5 L36,17.5 L24,17 L24,9Z" fill="rgba(55,0,0,0.55)" />
                <rect x="5" y="7" width="3" height="5" rx="0.8" fill="rgba(220,55,55,0.95)" />
                <rect x="5" y="14" width="3" height="5" rx="0.8" fill="rgba(220,55,55,0.95)" />
                <rect x="0.5" y="-6" width="4.5" height="38" rx="1.5" fill="#1c1c1c" />
                <rect x="49" y="1" width="6.5" height="7.5" rx="1.5" fill="rgba(255,250,195,0.9)" />
                <rect x="49" y="17.5" width="6.5" height="7.5" rx="1.5" fill="rgba(255,250,195,0.9)" />
              </svg>
            </div>
          </div>
        )}

        {/* Person */}
        {!isMobile && (
          <div ref={personRef} style={{
            position: 'absolute', top: 0, left: 0,
            opacity: 0, pointerEvents: 'none', zIndex: 7, willChange: 'transform, opacity',
          }}>
            <svg viewBox="0 0 36 56" width="32" height="50" style={{ display: 'block', overflow: 'visible' }}>
              <ellipse cx="16" cy="54" rx="10" ry="3" fill="rgba(0,0,0,0.22)" />
              <circle cx="14" cy="7" r="6.5" fill="#c5a882" />
              <rect x="9" y="13" width="10" height="17" rx="4" fill="#c5a882" />
              <line x1="9" y1="17" x2="2" y2="27" stroke="#c5a882" strokeWidth="3" strokeLinecap="round" />
              <g ref={armRef}>
                <line x1="19" y1="16" x2="28" y2="9" stroke="#c5a882" strokeWidth="3" strokeLinecap="round" />
                <line x1="27" y1="9" x2="33" y2="4" stroke="#7a5a1a" strokeWidth="2.2" strokeLinecap="round" />
                <ellipse cx="33.5" cy="2.5" rx="2.2" ry="3.5" fill="#c5a882" transform="rotate(-38 33.5 2.5)" />
                <ellipse cx="34.5" cy="1" rx="1.2" ry="2" fill="rgba(255,255,255,0.25)" transform="rotate(-38 34.5 1)" />
              </g>
              <line x1="12" y1="30" x2="8" y2="48" stroke="#c5a882" strokeWidth="3" strokeLinecap="round" />
              <line x1="16" y1="30" x2="20" y2="48" stroke="#c5a882" strokeWidth="3" strokeLinecap="round" />
              <ellipse cx="7" cy="49" rx="4.2" ry="2.2" fill="#7a5a1a" />
              <ellipse cx="21" cy="49" rx="4.2" ry="2.2" fill="#7a5a1a" />
            </svg>
          </div>
        )}

        {phase !== 'idle' && phase !== 'done' && !isMobile && (
          <div style={{ position: 'absolute', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10, fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.35)' }}>
            {phaseLabel}
          </div>
        )}

        {phase === 'done' && !isMobile && (
          <button onClick={() => setReplayKey(k => k + 1)} style={{
            position: 'absolute', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)',
            zIndex: 10, background: 'transparent', border: '0.5px solid rgba(197,168,130,0.4)',
            color: 'rgba(197,168,130,0.7)', fontSize: '10px', letterSpacing: '0.22em',
            textTransform: 'uppercase', padding: '0.5rem 1.5rem', cursor: 'pointer',
            fontFamily: 'var(--font-inter),sans-serif',
          }}>
            Replay ↺
          </button>
        )}
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div>
        <section style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 3rem' }}>
          <div style={{ maxWidth: isMobile ? '100%' : '48%' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1.25rem' }}>Canvas Routes · Season 2026</div>
            <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.8rem,5vw,4.5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.06, letterSpacing: '-0.01em', marginBottom: '1.25rem' }}>Every road<br />worth driving.</h1>
            <div style={{ width: '36px', height: '0.5px', background: 'rgba(197,168,130,0.5)', marginBottom: '1.25rem' }} />
            <p style={{ fontSize: '14px', color: 'rgba(245,241,236,0.45)', lineHeight: 1.9, maxWidth: '320px', marginBottom: '2rem' }}>Curated road trips and convoy drives across Quebec and beyond.</p>
            <Link href="/membership" style={{ display: 'inline-block', padding: '0.85rem 2.25rem', background: '#c5a882', color: '#0F1E14', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: '600' }}>Join Canvas Routes</Link>
          </div>
        </section>
        <section style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 3rem' }}>
          <div style={{ maxWidth: isMobile ? '100%' : '48%' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1rem' }}>The Route</div>
            <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>Backroads.<br />No shortcuts.</h2>
            <p style={{ fontSize: '14px', color: 'rgba(245,241,236,0.45)', lineHeight: 1.9, maxWidth: '320px' }}>We plan every route to avoid highways. Winding two-lane roads, elevation changes and long sweeping corners.</p>
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
