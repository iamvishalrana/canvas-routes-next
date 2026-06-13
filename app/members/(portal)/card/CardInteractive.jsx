'use client'
import { useRef, useState, useEffect } from 'react'

export default function CardInteractive({ children }) {
  const tiltRef  = useRef(null)
  const [tilt, setTilt]         = useState({ x: 0, y: 0 })
  const [gloss, setGloss]       = useState({ x: 50, y: 50 })
  const [glossOn, setGlossOn]   = useState(false)
  // 'idle' | 'down' | 'spring'
  const [press, setPress]       = useState('idle')
  const [shimmer, setShimmer]   = useState(false)
  const touchStartRef = useRef(null)
  const springTimer  = useRef(null)
  const shimmerTimer = useRef(null)

  // ── Fire shimmer once on mount ─────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setShimmer(true)
      shimmerTimer.current = setTimeout(() => setShimmer(false), 800)
    }, 550)
    return () => { clearTimeout(t); clearTimeout(shimmerTimer.current) }
  }, [])

  function getCoords(clientX, clientY) {
    const el = tiltRef.current
    if (!el) return { px: 50, py: 50, tx: 0, ty: 0 }
    const r = el.getBoundingClientRect()
    const px = ((clientX - r.left) / r.width)  * 100
    const py = ((clientY - r.top)  / r.height) * 100
    const tx = ((clientY - r.top  - r.height / 2) / (r.height / 2)) * -9
    const ty = ((clientX - r.left - r.width  / 2) / (r.width  / 2)) *  9
    return { px, py, tx, ty }
  }

  function springBack() {
    clearTimeout(springTimer.current)
    setPress('spring')
    springTimer.current = setTimeout(() => setPress('idle'), 480)
  }

  // ── Mouse ──────────────────────────────────────────────
  function onMouseMove(e) {
    const { px, py, tx, ty } = getCoords(e.clientX, e.clientY)
    setTilt({ x: tx, y: ty })
    setGloss({ x: px, y: py })
  }
  function onMouseEnter() { setGlossOn(true) }
  function onMouseLeave() {
    setGlossOn(false)
    setTilt({ x: 0, y: 0 })
  }
  function onMouseDown()  { setPress('down') }
  function onMouseUp()    { springBack() }

  // ── Touch ──────────────────────────────────────────────
  function onTouchStart(e) {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY }
    const { px, py, tx, ty } = getCoords(t.clientX, t.clientY)
    setGlossOn(true)
    setGloss({ x: px, y: py })
    setTilt({ x: tx * 0.45, y: ty * 0.45 })
    setPress('down')
  }
  function onTouchMove(e) {
    const t = e.touches[0]
    const { px, py, tx, ty } = getCoords(t.clientX, t.clientY)
    setTilt({ x: tx * 0.45, y: ty * 0.45 })
    setGloss({ x: px, y: py })
  }
  function onTouchEnd(e) {
    setGlossOn(false)
    setTilt({ x: 0, y: 0 })
    springBack()
    touchStartRef.current = null
  }

  // ── Scale value per phase ──────────────────────────────
  const scaleValue = press === 'down' ? 0.965 : 1

  // Scale transition:
  //   down  → snappy press
  //   spring → overshoot cubic-bezier then settle
  //   idle  → instant reset
  const scaleTrans = press === 'down'
    ? 'transform 0.1s ease-in'
    : press === 'spring'
      ? 'transform 0.55s cubic-bezier(0.34, 1.52, 0.64, 1)'
      : 'transform 0.3s ease-out'

  // Tilt transition:
  //   while tracking → fast, responsive
  //   returning flat → smooth settle
  const tiltTrans = (glossOn || press === 'down')
    ? 'transform 0.12s ease-out'
    : 'transform 0.55s cubic-bezier(0.23, 1, 0.32, 1)'

  return (
    <>
      <style>{`
        @keyframes shimmer-card {
          0%   { left: -75%; opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { left: 140%; opacity: 0; }
        }
      `}</style>

      {/* Scale wrapper — spring bounce lives here */}
      <div style={{
        width: '100%',
        transform: `scale(${scaleValue})`,
        transition: scaleTrans,
        willChange: 'transform',
      }}>
        {/* Tilt wrapper — 3-D rotation lives here */}
        <div
          ref={tiltRef}
          onMouseMove={onMouseMove}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            width: '100%',
            position: 'relative',
            transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: tiltTrans,
            transformStyle: 'preserve-3d',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            cursor: 'default',
            willChange: 'transform',
          }}
        >
          {children}

          {/* Gloss — follows pointer / touch */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '16px',
            background: glossOn
              ? `radial-gradient(circle at ${gloss.x}% ${gloss.y}%, rgba(255,255,255,0.07) 0%, transparent 55%)`
              : 'transparent',
            opacity: glossOn ? 1 : 0,
            transition: 'opacity 0.25s ease',
            pointerEvents: 'none', zIndex: 30,
          }} />

          {/* Shimmer — mount only */}
          {shimmer && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '16px',
              overflow: 'hidden', pointerEvents: 'none', zIndex: 31,
            }}>
              <div style={{
                position: 'absolute', top: '-10%', left: '-75%',
                width: '50%', height: '120%',
                background: 'linear-gradient(105deg, transparent 10%, rgba(255,255,255,0.11) 50%, transparent 90%)',
                transform: 'skewX(-10deg)',
                animation: 'shimmer-card 0.85s cubic-bezier(0.4, 0, 0.2, 1) forwards',
              }} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
