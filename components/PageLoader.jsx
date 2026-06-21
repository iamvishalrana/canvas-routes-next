'use client'
import { useState, useEffect } from 'react'

export default function PageLoader({ images = [], minMs = 800 }) {
  const [out, setOut] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const start = Date.now()

    function finish() {
      const wait = Math.max(0, minMs - (Date.now() - start))
      setTimeout(() => {
        setOut(true)
        setTimeout(() => setGone(true), 580)
      }, wait)
    }

    if (!images.length) { finish(); return }

    let count = 0
    images.forEach(src => {
      const img = new window.Image()
      img.onload = img.onerror = () => { if (++count >= images.length) finish() }
      img.src = src
    })

    const bail = setTimeout(finish, 3500)
    return () => clearTimeout(bail)
  }, [])

  if (gone) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0F1E14',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: out ? 0 : 1,
      pointerEvents: out ? 'none' : 'all',
      transition: 'opacity 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/white-outline.png" alt="" style={{ width: '100px', opacity: 0.85 }} />
      <div style={{ marginTop: '2.5rem', width: '64px', height: '1px', background: 'rgba(197,168,130,0.2)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, #c5a882, transparent)', animation: 'cr-loader-shimmer 1.3s ease-in-out infinite' }} />
      </div>
      <style>{`
        @keyframes cr-loader-shimmer {
          0%   { transform: translateX(-200%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  )
}
