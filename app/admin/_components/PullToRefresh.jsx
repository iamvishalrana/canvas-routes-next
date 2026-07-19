'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

// Native iOS Safari's rubber-band pull-to-refresh only exists inside the browser
// chrome — a standalone home-screen app (display: standalone, see admin-manifest.json)
// has no chrome to drive it, so the gesture has to be reimplemented by hand here.
const PULL_THRESHOLD = 70
const MAX_PULL = 100

export default function PullToRefresh({ onRefresh, children }) {
  const containerRef = useRef(null)
  const startY = useRef(null)
  const pulling = useRef(false)
  const pullDistanceRef = useRef(0)
  const [pullDistance, setPullDistanceState] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  // Keep a ref mirror of pullDistance so handleTouchEnd can read the latest
  // value synchronously — putting that read inside a setState updater instead
  // would run onRefresh's side effects twice under React StrictMode's
  // dev-mode double-invocation of updater functions.
  const setPullDistance = useCallback((v) => {
    pullDistanceRef.current = v
    setPullDistanceState(v)
  }, [])

  const handleTouchStart = useCallback((e) => {
    if (refreshing) return
    if (window.scrollY > 0) { pulling.current = false; return }
    startY.current = e.touches[0].clientY
    pulling.current = true
  }, [refreshing])

  const handleTouchMove = useCallback((e) => {
    if (!pulling.current || startY.current == null) return
    // A real scroll happening underneath (only possible before the first
    // downward sample arrives and preventDefault kicks in) cancels the gesture.
    if (window.scrollY > 0) { pulling.current = false; setPullDistance(0); return }
    const delta = e.touches[0].clientY - startY.current
    // Early samples routinely read zero/negative from finger jitter before the
    // drag direction settles — that's not a cancel, just "not pulling yet".
    if (delta <= 0) { setPullDistance(0); return }
    // Only the manual gesture should move the page — block the native scroll/bounce underneath it.
    e.preventDefault()
    setPullDistance(Math.min(delta * 0.5, MAX_PULL))
  }, [setPullDistance])

  const handleTouchEnd = useCallback(() => {
    if (!pulling.current) { setPullDistance(0); return }
    pulling.current = false
    if (pullDistanceRef.current >= PULL_THRESHOLD) {
      setRefreshing(true)
      setPullDistance(PULL_THRESHOLD)
      Promise.resolve(onRefresh?.()).finally(() => {
        setTimeout(() => { setRefreshing(false); setPullDistance(0) }, 400)
      })
    } else {
      setPullDistance(0)
    }
  }, [onRefresh, setPullDistance])

  // React makes JSX-bound touchmove listeners passive, so preventDefault() inside
  // one is silently ignored — a native listener is the only way to actually stop
  // the page from scrolling underneath the pull gesture.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', handleTouchMove)
  }, [handleTouchMove])

  // Stop iOS's own overscroll/rubber-band from fighting the custom gesture.
  useEffect(() => {
    const prev = document.documentElement.style.overscrollBehaviorY
    document.documentElement.style.overscrollBehaviorY = 'contain'
    return () => { document.documentElement.style.overscrollBehaviorY = prev }
  }, [])

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1)
  const showIndicator = pullDistance > 0 || refreshing

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{ position: 'relative' }}
    >
      {showIndicator && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: `${refreshing ? PULL_THRESHOLD : pullDistance}px`,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden',
          transition: pulling.current ? 'none' : 'height 0.2s ease', zIndex: 5, pointerEvents: 'none',
        }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '50%', marginBottom: '10px',
            border: '2px solid rgba(197,168,130,0.25)', borderTopColor: '#c5a882',
            animation: refreshing ? 'admin-ptr-spin 0.7s linear infinite' : 'none',
            transform: refreshing ? 'none' : `rotate(${progress * 360}deg)`,
            opacity: refreshing ? 1 : progress,
          }} />
        </div>
      )}
      <div style={{
        // Only set `transform` while actually mid-gesture. ANY non-`none`
        // transform value on an ancestor — even translateY(0px) at rest —
        // makes it the containing block for `position: fixed` descendants,
        // so every admin modal (ConfirmDialog, ExportModal, etc.) rendered
        // anywhere inside {children} would center against this wrapper's
        // full scrollable height instead of the viewport, landing well
        // below the fold on any page taller than one screen. Omitting the
        // property entirely at rest restores normal fixed-position
        // behavior relative to the viewport.
        ...(pullDistance || refreshing ? { transform: `translateY(${refreshing ? PULL_THRESHOLD : pullDistance}px)` } : {}),
        transition: pulling.current ? 'none' : 'transform 0.2s ease',
      }}>
        {children}
      </div>
    </div>
  )
}
