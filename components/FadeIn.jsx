'use client'
import { useRef, useState, useEffect } from 'react'

export default function FadeIn({ children, delay = 0, style = {} }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity 0.7s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
