'use client'
import { useRef, useState, useEffect } from 'react'

export default function CountUp({ to, pad = 0, prefix = '', suffix = '', duration = 700 }) {
  const ref    = useRef(null)
  const [count, setCount] = useState(0)
  const started = useRef(false)
  const num = Number(to) || 0

  useEffect(() => {
    const el = ref.current
    if (!el || started.current) return
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      started.current = true
      obs.disconnect()
      const t0 = performance.now()
      function tick(now) {
        const p = Math.min((now - t0) / duration, 1)
        const e = 1 - Math.pow(1 - p, 3) // ease-out cubic
        const v = Math.round(e * num)
        setCount(v)
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [num, duration])

  const display = pad > 0 ? String(count).padStart(pad, '0') : String(count)
  return <span ref={ref}>{prefix}{display}{suffix}</span>
}
