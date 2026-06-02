'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// Winding road path — starts bottom-left, sweeps up and right like a mountain backroad
const PATH_D = 'M 80 720 C 150 680 220 640 320 580 C 420 520 480 460 560 400 C 640 340 720 300 820 260 C 920 220 1020 180 1120 120'

function CarSVG() {
  return (
    // Sports car silhouette facing right, origin at centre of car
    <g transform="translate(-58, -22)">
      {/* Shadow */}
      <ellipse cx="58" cy="40" rx="54" ry="5" fill="rgba(0,0,0,0.35)" />
      {/* Body lower */}
      <path d="M 8 30 Q 8 36 16 36 L 100 36 Q 108 36 108 30 L 108 24 Q 104 20 96 20 L 20 20 Q 12 20 8 24 Z" fill="#1a1a1a" />
      {/* Body upper */}
      <path d="M 24 20 L 34 8 Q 38 4 44 4 L 76 4 Q 82 4 86 8 L 96 20 Z" fill="#1a1a1a" />
      {/* Window */}
      <path d="M 36 19 L 44 7 L 76 7 L 84 19 Z" fill="rgba(197,168,130,0.25)" />
      {/* Window divider */}
      <line x1="60" y1="7" x2="60" y2="19" stroke="rgba(197,168,130,0.4)" strokeWidth="1" />
      {/* Wheel arches */}
      <path d="M 8 30 Q 8 20 28 20 L 40 20 Q 50 20 50 30" fill="#111" />
      <path d="M 66 30 Q 66 20 76 20 L 88 20 Q 108 20 108 30" fill="#111" />
      {/* Wheels */}
      <circle cx="29" cy="34" r="9" fill="#111" stroke="#c5a882" strokeWidth="1.5" />
      <circle cx="29" cy="34" r="4" fill="#2a2a2a" stroke="#c5a882" strokeWidth="0.8" />
      <circle cx="87" cy="34" r="9" fill="#111" stroke="#c5a882" strokeWidth="1.5" />
      <circle cx="87" cy="34" r="4" fill="#2a2a2a" stroke="#c5a882" strokeWidth="0.8" />
      {/* Headlight */}
      <path d="M 106 24 L 112 26 L 112 30 L 106 30 Z" fill="rgba(255,240,180,0.7)" />
      {/* Gold trim line */}
      <line x1="10" y1="26" x2="96" y2="26" stroke="rgba(197,168,130,0.5)" strokeWidth="0.8" />
    </g>
  )
}

export default function TestPage() {
  const containerRef = useRef(null)
  const pathRef = useRef(null)
  const rafRef = useRef(null)
  const [carPos, setCarPos] = useState({ x: 80, y: 720, angle: -28 })
  const [scrollPct, setScrollPct] = useState(0)

  useEffect(() => {
    function update() {
      if (!containerRef.current || !pathRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const containerH = containerRef.current.offsetHeight
      const winH = window.innerHeight
      const scrolled = -rect.top
      const maxScroll = containerH - winH
      const p = Math.max(0, Math.min(1, scrolled / maxScroll))
      setScrollPct(p)

      const totalLen = pathRef.current.getTotalLength()
      const len = p * totalLen
      const pt = pathRef.current.getPointAtLength(len)
      const pt2 = pathRef.current.getPointAtLength(Math.min(len + 8, totalLen))
      const angle = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * (180 / Math.PI)
      setCarPos({ x: pt.x, y: pt.y, angle })
    }

    update()
    function onScroll() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div style={{ background: '#F5F1EC', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2rem', height: '64px', background: 'rgba(15,30,20,0.85)', backdropFilter: 'blur(12px)', borderBottom: '0.5px solid rgba(197,168,130,0.15)' }}>
        <Link href="/" style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.1rem', fontWeight: '300', color: '#F5F1EC', textDecoration: 'none', letterSpacing: '0.04em' }}>Canvas Routes</Link>
        <Link href="/" style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.5)', textDecoration: 'none' }}>← Back to site</Link>
      </nav>

      {/* ── Scroll container: 3× viewport so car has travel room ── */}
      <div ref={containerRef} style={{ height: '300vh', position: 'relative' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', background: '#0F1E14' }}>

          {/* Atmosphere gradients */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 60% 110%, rgba(197,168,130,0.06) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 40%)' }} />

          {/* Distant mountain silhouette */}
          <svg viewBox="0 0 1200 800" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid slice">
            <path d="M 0 500 L 80 380 L 160 440 L 260 300 L 360 400 L 440 280 L 540 360 L 640 220 L 740 340 L 840 260 L 940 380 L 1040 300 L 1140 420 L 1200 380 L 1200 800 L 0 800 Z"
              fill="rgba(255,255,255,0.03)" />
            <path d="M 0 560 L 100 450 L 200 510 L 300 420 L 400 480 L 500 390 L 600 460 L 700 380 L 800 450 L 900 400 L 1000 470 L 1100 430 L 1200 490 L 1200 800 L 0 800 Z"
              fill="rgba(255,255,255,0.04)" />
          </svg>

          {/* Road + car SVG canvas */}
          <svg
            viewBox="0 0 1200 800"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            preserveAspectRatio="xMidYMid slice"
          >
            {/* Hidden path used for measurement */}
            <path ref={pathRef} d={PATH_D} fill="none" stroke="none" />

            {/* Road glow */}
            <path d={PATH_D} fill="none" stroke="rgba(197,168,130,0.06)" strokeWidth="18" strokeLinecap="round" />
            {/* Road surface */}
            <path d={PATH_D} fill="none" stroke="rgba(197,168,130,0.12)" strokeWidth="6" strokeLinecap="round" />
            {/* Road centre dashes */}
            <path d={PATH_D} fill="none" stroke="rgba(197,168,130,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="14 18" />

            {/* Progress trail — road already driven */}
            {scrollPct > 0 && (
              <path d={PATH_D} fill="none" stroke="rgba(197,168,130,0.55)" strokeWidth="1.5"
                strokeLinecap="round" strokeDasharray="14 18"
                style={{ strokeDashoffset: 0 }}
              />
            )}

            {/* Car */}
            <g transform={`translate(${carPos.x}, ${carPos.y}) rotate(${carPos.angle})`}>
              <CarSVG />
            </g>

            {/* Horizon line */}
            <line x1="0" y1="320" x2="1200" y2="320" stroke="rgba(197,168,130,0.04)" strokeWidth="1" />
          </svg>

          {/* Text — fades as you scroll */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', opacity: Math.max(0, 1 - scrollPct * 3), pointerEvents: 'none', zIndex: 2 }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.6)', marginBottom: '1rem', fontFamily: 'var(--font-inter),sans-serif' }}>Canvas Routes</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.5rem,5vw,4rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.05, letterSpacing: '-0.01em' }}>
              The road calls.<br />We answer.
            </div>
          </div>

          {/* Scroll cue */}
          <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', opacity: Math.max(0, 1 - scrollPct * 4), textAlign: 'center', zIndex: 2 }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.4)', marginBottom: '0.5rem', fontFamily: 'var(--font-inter),sans-serif' }}>Scroll</div>
            <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="rgba(197,168,130,0.35)" strokeWidth="1.2" strokeLinecap="round">
              <line x1="6" y1="0" x2="6" y2="12"/><polyline points="2 8 6 12 10 8"/>
            </svg>
          </div>

          {/* Progress indicator */}
          <div style={{ position: 'absolute', bottom: '2rem', right: '2rem', zIndex: 2 }}>
            <div style={{ width: '2px', height: '80px', background: 'rgba(197,168,130,0.12)', borderRadius: '1px', overflow: 'hidden' }}>
              <div style={{ width: '100%', background: '#c5a882', height: `${scrollPct * 100}%`, transition: 'height 0.05s linear', borderRadius: '1px' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Below fold — normal content */}
      <section style={{ background: '#F5F1EC', padding: '6rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>The page continues here</div>
          <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.1, marginBottom: '1.5rem' }}>
            Content below the hero sits here as normal.
          </div>
          <div style={{ width: '32px', height: '0.5px', background: '#c5a882', margin: '0 auto 1.5rem' }} />
          <p style={{ fontSize: '15px', color: '#777', lineHeight: 1.9 }}>
            The car animation lives entirely inside the scroll container above — once you've scrolled through it, the rest of the page works exactly as usual. This section is just showing that the two coexist cleanly.
          </p>
          <div style={{ marginTop: '2.5rem' }}>
            <Link href="/" style={{ display: 'inline-block', padding: '0.85rem 2rem', background: '#0F1E14', color: '#F5F1EC', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', textDecoration: 'none' }}>
              Back to homepage
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
