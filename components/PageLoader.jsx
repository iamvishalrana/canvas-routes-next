'use client'
import { useState, useEffect } from 'react'

export default function PageLoader({ images = [], minMs = 1500 }) {
  const [out, setOut]   = useState(false)
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

    const bail = setTimeout(finish, 4000)
    return () => clearTimeout(bail)
  }, [])

  if (gone) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#F5F1EC',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: out ? 0 : 1,
      pointerEvents: out ? 'none' : 'all',
      transition: 'opacity 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/canvas_routes_refined.png"
        alt="Canvas Routes"
        style={{ width: '200px', opacity: 0.92 }}
      />
      {/* Golden streak line — fires once every 2 seconds */}
      <div style={{
        marginTop: '2.5rem',
        width: '120px', height: '1px',
        background: 'rgba(197,168,130,0.3)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: '-1px', left: '-110%',
          width: '55%', height: '3px',
          background: 'linear-gradient(90deg, transparent 10%, #c5a882 50%, transparent 90%)',
          animation: 'cr-loader-streak 2s ease-in-out infinite',
        }} />
      </div>
      <style>{`
        @keyframes cr-loader-streak {
          0%, 100% { left: -110%; opacity: 0; }
          5%        { opacity: 1; }
          40%       { left: 130%; opacity: 0; }
          41%, 99%  { left: -110%; opacity: 0; }
        }
      `}</style>
    </div>
  )
}
