'use client'
import { useState, useEffect } from 'react'

// Pages that need a CTA pinned to the bottom of the screen on mobile (e.g.
// the Cars & Coffee registration form's sticky submit bar) mark it with
// data-fixed-bottom-bar — this button reads that element's live position and
// shifts itself above it whenever the two would actually overlap, so it
// works regardless of whether the bar gets there via position:fixed (always
// pinned) or position:sticky (only pinned while scrolling through its own
// container) — checked by bounding rect, not the CSS position value, since
// a sticky element reports position:sticky whether or not it's currently
// stuck.
function useFixedBarClearance() {
  const [clearance, setClearance] = useState(0)
  useEffect(() => {
    function measure() {
      const el = document.querySelector('[data-fixed-bottom-bar]')
      if (!el) { setClearance(0); return }
      const rect = el.getBoundingClientRect()
      const pinnedToBottom = rect.height > 0 && Math.abs(rect.bottom - window.innerHeight) < 4
      setClearance(pinnedToBottom ? rect.height : 0)
    }
    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(document.body)
    return () => {
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      ro.disconnect()
    }
  }, [])
  return clearance
}

export default function BackToTop() {
  const [visible, setVisible] = useState(false)
  const clearance = useFixedBarClearance()

  useEffect(() => {
    function onScroll() { setVisible(window.scrollY > 400) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <>
    <style>{`@keyframes btt-in{from{opacity:0;transform:translateY(6px)}to{opacity:0.85;transform:translateY(0)}}`}</style>
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      style={{
        position: 'fixed',
        bottom: `calc(1.75rem + ${clearance}px)`,
        right: '1.75rem',
        zIndex: 999,
        transition: 'opacity 0.2s, bottom 0.2s ease',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: '#0F1E14',
        border: '0.5px solid rgba(197,168,130,0.35)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.85,
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
        animation: 'btt-in 0.25s ease forwards',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
      onMouseLeave={e => e.currentTarget.style.opacity = '0.85'}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15"/>
      </svg>
    </button>
    </>
  )
}
