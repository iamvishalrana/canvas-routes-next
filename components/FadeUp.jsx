'use client'
import { useRef, useState, useEffect } from 'react'

export default function FadeUp({ children, delay = 0, style, className }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.08, rootMargin: '0px 0px -32px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.55s ease ${delay}ms, transform 0.6s cubic-bezier(0.23, 1, 0.32, 1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
