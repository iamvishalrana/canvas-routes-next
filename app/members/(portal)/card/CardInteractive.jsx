'use client'
import { useRef, useState } from 'react'

export default function CardInteractive({ children }) {
  const ref = useRef(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [gloss, setGloss] = useState({ x: 50, y: 50 })
  const [hovered, setHovered] = useState(false)
  const [pressing, setPressing] = useState(false)
  const [shimmering, setShimmering] = useState(false)
  const touchStartRef = useRef(null)

  function getCoords(clientX, clientY) {
    const el = ref.current
    if (!el) return { px: 50, py: 50, tx: 0, ty: 0 }
    const r = el.getBoundingClientRect()
    const px = ((clientX - r.left) / r.width) * 100
    const py = ((clientY - r.top) / r.height) * 100
    const tx = ((clientY - r.top - r.height / 2) / (r.height / 2)) * -10
    const ty = ((clientX - r.left - r.width / 2) / (r.width / 2)) * 10
    return { px, py, tx, ty }
  }

  function triggerShimmer() {
    setPressing(true)
    setShimmering(false)
    // tiny timeout so re-triggering resets the animation
    requestAnimationFrame(() => {
      setShimmering(true)
      setPressing(false)
    })
    setTimeout(() => setShimmering(false), 750)
  }

  // ── Mouse ──────────────────────────────────────────────
  function onMouseMove(e) {
    const { px, py, tx, ty } = getCoords(e.clientX, e.clientY)
    setTilt({ x: tx, y: ty })
    setGloss({ x: px, y: py })
  }
  function onMouseEnter() { setHovered(true) }
  function onMouseLeave() {
    setHovered(false)
    setTilt({ x: 0, y: 0 })
  }
  function onMouseDown() { setPressing(true) }
  function onMouseUp()   { setPressing(false); triggerShimmer() }

  // ── Touch ──────────────────────────────────────────────
  function onTouchStart(e) {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY }
    const { px, py, tx, ty } = getCoords(t.clientX, t.clientY)
    setHovered(true)
    setTilt({ x: tx * 0.5, y: ty * 0.5 })
    setGloss({ x: px, y: py })
    setPressing(true)
  }
  function onTouchMove(e) {
    const t = e.touches[0]
    const { px, py, tx, ty } = getCoords(t.clientX, t.clientY)
    setTilt({ x: tx * 0.5, y: ty * 0.5 })
    setGloss({ x: px, y: py })
  }
  function onTouchEnd(e) {
    const start = touchStartRef.current
    const dx = start ? Math.abs(e.changedTouches[0].clientX - start.x) : 99
    const dy = start ? Math.abs(e.changedTouches[0].clientY - start.y) : 99
    setPressing(false)
    setHovered(false)
    setTilt({ x: 0, y: 0 })
    if (dx < 12 && dy < 12) triggerShimmer()
  }

  const transform = [
    'perspective(900px)',
    `rotateX(${tilt.x}deg)`,
    `rotateY(${tilt.y}deg)`,
    `scale(${pressing ? 0.975 : 1})`,
  ].join(' ')

  return (
    <>
      <style>{`
        @keyframes shimmer-card {
          from { left: -80%; }
          to   { left: 140%; }
        }
      `}</style>

      <div
        ref={ref}
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
          transform,
          transition: pressing
            ? 'transform 0.08s ease-in'
            : 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
          transformStyle: 'preserve-3d',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: 'default',
        }}
      >
        {children}

        {/* Moving gloss — follows pointer */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '16px',
          background: hovered
            ? `radial-gradient(circle at ${gloss.x}% ${gloss.y}%, rgba(255,255,255,0.065) 0%, transparent 55%)`
            : 'none',
          pointerEvents: 'none', zIndex: 30,
          transition: 'opacity 0.2s',
        }} />

        {/* Shimmer sweep — fires on tap/click */}
        {shimmering && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '16px',
            overflow: 'hidden', pointerEvents: 'none', zIndex: 31,
          }}>
            <div style={{
              position: 'absolute', top: '-10%', left: '-80%',
              width: '55%', height: '120%',
              background: 'linear-gradient(105deg, transparent 15%, rgba(255,255,255,0.10) 50%, transparent 85%)',
              transform: 'skewX(-12deg)',
              animation: 'shimmer-card 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            }} />
          </div>
        )}
      </div>
    </>
  )
}
