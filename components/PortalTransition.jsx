'use client'
import { useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function PortalTransition({ children }) {
  const ref      = useRef(null)
  const pathname = usePathname()
  const isFirst  = useRef(true)

  useEffect(() => {
    // Skip on initial mount — FadeUp handles first-load entrance
    if (isFirst.current) { isFirst.current = false; return }
    const el = ref.current
    if (!el) return
    // Direct DOM restart — same reflow trick as the card bounce
    el.style.animation = 'none'
    void el.offsetHeight
    el.style.animation = 'portal-page-in 0.35s cubic-bezier(0.23, 1, 0.32, 1) both'
    // Release the animation once done: fill-mode 'both' would otherwise pin a
    // transform on this wrapper forever, and a transformed ancestor hijacks
    // position:fixed — the routes interest sheet (and any fixed overlay)
    // would anchor to the page instead of the viewport and render off-screen.
    el.addEventListener('animationend', () => { el.style.animation = '' }, { once: true })
  }, [pathname])

  return <div ref={ref}>{children}</div>
}
