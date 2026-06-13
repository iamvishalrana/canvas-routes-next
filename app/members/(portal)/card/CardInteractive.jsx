'use client'
import { useRef, useState, useEffect } from 'react'

export default function CardInteractive({ children }) {
  const tiltRef  = useRef(null)
  const [tilt, setTilt]       = useState({ x: 0, y: 0 })
  const [gloss, setGloss]     = useState({ x: 50, y: 50 })
  const [glossOn, setGlossOn] = useState(false)
  const [bounce, setBounce]   = useState(false)
  const [shimmer, setShimmer] = useState(false)
  const touchStartRef = useRef(null)
  const bounceTimer   = useRef(null)
  const shimmerTimer  = useRef(null)

  // ── Shimmer once on mount ─────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setShimmer(true)
      shimmerTimer.current = setTimeout(() => setShimmer(false), 900)
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

  // Single keyframe animation — no transition switching, no stutter
  function triggerBounce() {
    clearTimeout(bounceTimer.current)
    setBounce(false)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setBounce(true)
      bounceTimer.current = setTimeout(() => setBounce(false), 600)
    }))
  }

  // ── Mouse ──────────────────────────────────────────────
  function onMouseMove(e) {
    const { px, py, tx, ty } = getCoords(e.clientX, e.clientY)
    setTilt({ x: tx, y: ty })
    setGloss({ x: px, y: py })
  }
  function onMouseEnter() { setGlossOn(true) }
  function onMouseLeave() { setGlossOn(false); setTilt({ x: 0, y: 0 }) }
  function onMouseDown()  { /* handled by animation */ }
  function onMouseUp()    { triggerBounce() }

  // ── Touch ──────────────────────────────────────────────
  function onTouchStart(e) {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY }
    const { px, py, tx, ty } = getCoords(t.clientX, t.clientY)
    setGlossOn(true)
    setGloss({ x: px, y: py })
    setTilt({ x: tx * 0.4, y: ty * 0.4 })
  }
  function onTouchMove(e) {
    const t = e.touches[0]
    const { px, py, tx, ty } = getCoords(t.clientX, t.clientY)
    setTilt({ x: tx * 0.4, y: ty * 0.4 })
    setGloss({ x: px, y: py })
  }
  function onTouchEnd(e) {
    const start = touchStartRef.current
    const dx = start ? Math.abs(e.changedTouches[0].clientX - start.x) : 99
    const dy = start ? Math.abs(e.changedTouches[0].clientY - start.y) : 99
    setGlossOn(false)
    setTilt({ x: 0, y: 0 })
    if (dx < 12 && dy < 12) triggerBounce()
    touchStartRef.current = null
  }

  const tiltTrans = glossOn
    ? 'transform 0.12s ease-out'
    : 'transform 0.55s cubic-bezier(0.23, 1, 0.32, 1)'

  return (
    <>
      <style>{`
        @keyframes shimmer-card {
          0%   { left: -75%; opacity: 0; }
          12%  { opacity: 1; }
          88%  { opacity: 1; }
          100% { left: 145%; opacity: 0; }
        }
        @keyframes card-press-spring {
          0%   { transform: scale(1); }
          18%  { transform: scale(0.963); }
          55%  { transform: scale(1.024); }
          78%  { transform: scale(0.996); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Bounce wrapper — CSS keyframe animation, zero stutter */}
      <div style={{
        width: '100%',
        animation: bounce ? 'card-press-spring 0.58s cubic-bezier(0.34, 1.52, 0.64, 1) forwards' : 'none',
      }}>
        {/* Tilt wrapper */}
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

          {/* Gloss */}
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
                animation: 'shimmer-card 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards',
              }} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
