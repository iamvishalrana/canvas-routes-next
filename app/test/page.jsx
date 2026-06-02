'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// Desktop — right side, 5 full S-curves top→bottom
const PATH_DESKTOP = [
  'M 900 20',
  'C 1120 110, 660 210, 900 320',
  'C 1120 430, 1100 530, 880 630',
  'C 660 720, 1100 790, 900 800',
].join(' ')

// Mobile — centred, 3 big waves, full width
const PATH_MOBILE = [
  'M 600 20',
  'C 900 130, 300 240, 600 360',
  'C 900 480, 900 580, 600 680',
  'C 300 770, 700 790, 600 800',
].join(' ')

function CarSVG() {
  return (
    <g transform="translate(-93, -35) scale(1.6)">
      <ellipse cx="58" cy="43" rx="52" ry="6" fill="rgba(0,0,0,0.45)" />
      <path d="M 8 30 Q 8 37 16 37 L 100 37 Q 108 37 108 30 L 108 23 Q 104 19 96 19 L 20 19 Q 12 19 8 23 Z"
        fill="#c5a882" />
      <path d="M 24 19 L 34 7 Q 38 3 44 3 L 76 3 Q 82 3 86 7 L 96 19 Z"
        fill="#c5a882" />
      <path d="M 36 18 L 44 6 L 76 6 L 84 18 Z" fill="rgba(10,20,14,0.8)" />
      <line x1="60" y1="6" x2="60" y2="18" stroke="rgba(197,168,130,0.3)" strokeWidth="0.8" />
      <path d="M 8 30 Q 8 19 28 19 L 42 19 Q 50 19 50 30" fill="#0F1E14" />
      <path d="M 66 30 Q 66 19 76 19 L 90 19 Q 108 19 108 30" fill="#0F1E14" />
      <circle cx="29" cy="35" r="10" fill="#0F1E14" stroke="#F5F1EC" strokeWidth="2" />
      <circle cx="29" cy="35" r="4.5" fill="#1a1a1a" stroke="rgba(245,241,236,0.5)" strokeWidth="1" />
      <circle cx="87" cy="35" r="10" fill="#0F1E14" stroke="#F5F1EC" strokeWidth="2" />
      <circle cx="87" cy="35" r="4.5" fill="#1a1a1a" stroke="rgba(245,241,236,0.5)" strokeWidth="1" />
      <path d="M 106 23 L 114 26 L 114 31 L 106 31 Z" fill="rgba(255,245,200,0.95)" />
      <line x1="10" y1="28" x2="96" y2="28" stroke="rgba(10,20,14,0.5)" strokeWidth="1.5" />
    </g>
  )
}

export default function TestPage() {
  const containerRef = useRef(null)
  const pathRef = useRef(null)
  const rafRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false)
  const [carPos, setCarPos] = useState({ x: 900, y: 20, angle: 80 })
  const [scrollPct, setScrollPct] = useState(0)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
      const pt2 = pathRef.current.getPointAtLength(Math.min(len + 6, totalLen))
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

  const pathD = isMobile ? PATH_MOBILE : PATH_DESKTOP

  return (
    <div style={{ background: '#0F1E14', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.5rem', height: '60px', background: 'rgba(10,20,13,0.8)', backdropFilter: 'blur(12px)', borderBottom: '0.5px solid rgba(197,168,130,0.12)' }}>
        <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.1rem', fontWeight: '300', color: '#F5F1EC', letterSpacing: '0.04em' }}>Canvas Routes</span>
        <Link href="/" style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)', textDecoration: 'none' }}>← Back</Link>
      </nav>

      {/* ── Scroll container — 800vh gives a long, slow journey ── */}
      <div ref={containerRef} style={{ height: '800vh', position: 'relative' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

          {/* Atmosphere */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 30% 50%, rgba(197,168,130,0.05) 0%, transparent 70%)' }} />

          {/* Desktop: text on left. Mobile: text at top */}
          {!isMobile && (
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '48%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 3.5rem 0 3rem', zIndex: 2, pointerEvents: 'none' }}>
              <div style={{ opacity: Math.max(0, 1 - scrollPct * 2.5), transform: `translateY(${scrollPct * -50}px)` }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1.25rem' }}>Canvas Routes · Season 2026</div>
                <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.5rem,4vw,3.8rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.08, letterSpacing: '-0.01em', marginBottom: '1.5rem' }}>
                  Every road<br />worth driving<br />starts here.
                </h1>
                <div style={{ width: '36px', height: '0.5px', background: 'rgba(197,168,130,0.5)', marginBottom: '1.5rem' }} />
                <p style={{ fontSize: '14px', color: 'rgba(245,241,236,0.45)', lineHeight: '1.9', maxWidth: '320px' }}>
                  Curated road trips and convoy drives across Quebec and beyond.
                </p>
              </div>
              <div style={{ position: 'absolute', left: '3rem', opacity: Math.max(0, Math.min(1, (scrollPct - 0.35) * 3.5)), transform: `translateY(${Math.max(0, (0.35 - scrollPct) * 80)}px)` }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1rem' }}>Road Trips</div>
                <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(1.8rem,3vw,2.8rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>
                  Backroads.<br />No shortcuts.
                </h2>
                <p style={{ fontSize: '13px', color: 'rgba(245,241,236,0.4)', lineHeight: '1.9', maxWidth: '280px' }}>Winding two-lane roads, elevation changes and long sweeping corners.</p>
              </div>
              <div style={{ position: 'absolute', left: '3rem', opacity: Math.max(0, Math.min(1, (scrollPct - 0.72) * 4)), transform: `translateY(${Math.max(0, (0.72 - scrollPct) * 80)}px)` }}>
                <div style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1rem' }}>Membership</div>
                <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(1.8rem,3vw,2.8rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>
                  Your seat<br />is held.
                </h2>
                <p style={{ fontSize: '13px', color: 'rgba(245,241,236,0.4)', lineHeight: '1.9', maxWidth: '280px' }}>Members get first access to every route before public registration opens.</p>
              </div>
            </div>
          )}

          {/* Mobile: text centered at top */}
          {isMobile && (
            <div style={{ position: 'absolute', top: '80px', left: 0, right: 0, textAlign: 'center', padding: '0 1.5rem', zIndex: 2, opacity: Math.max(0, 1 - scrollPct * 3), pointerEvents: 'none' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '0.75rem' }}>Canvas Routes</div>
              <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.2rem,7vw,3rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.08, letterSpacing: '-0.01em' }}>
                Every road worth<br />driving starts here.
              </h1>
            </div>
          )}

          {/* SVG — road + car */}
          <svg
            viewBox="0 0 1200 800"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            preserveAspectRatio="xMidYMid slice"
          >
            {/* Hidden measurement path — updates when isMobile changes */}
            <path key={pathD} ref={pathRef} d={pathD} fill="none" stroke="none" />

            {/* Vertical divider — desktop only */}
            {!isMobile && (
              <line x1="576" y1="0" x2="576" y2="800" stroke="rgba(197,168,130,0.06)" strokeWidth="1" />
            )}

            {/* Road layers */}
            <path d={pathD} fill="none" stroke="rgba(197,168,130,0.06)" strokeWidth="50" strokeLinecap="round" />
            <path d={pathD} fill="none" stroke="rgba(197,168,130,0.12)" strokeWidth="18" strokeLinecap="round" />
            <path d={pathD} fill="none" stroke="rgba(15,30,20,0.7)" strokeWidth="12" strokeLinecap="round" />
            <path d={pathD} fill="none" stroke="rgba(197,168,130,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="14 18" />

            {/* Car */}
            <g transform={`translate(${carPos.x}, ${carPos.y}) rotate(${carPos.angle})`}>
              <CarSVG />
            </g>
          </svg>

          {/* Scroll cue */}
          <div style={{ position: 'absolute', bottom: '1.75rem', left: '50%', transform: 'translateX(-50%)', opacity: Math.max(0, 1 - scrollPct * 6), textAlign: 'center', zIndex: 3 }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.35)', marginBottom: '0.4rem' }}>Scroll</div>
            <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="rgba(197,168,130,0.3)" strokeWidth="1.2" strokeLinecap="round">
              <line x1="6" y1="0" x2="6" y2="12"/><polyline points="2 8 6 12 10 8"/>
            </svg>
          </div>

          {/* Progress bar */}
          <div style={{ position: 'absolute', bottom: '1.75rem', right: '1.5rem', zIndex: 3 }}>
            <div style={{ width: '2px', height: '70px', background: 'rgba(197,168,130,0.1)', borderRadius: '1px', overflow: 'hidden' }}>
              <div style={{ width: '100%', background: '#c5a882', height: `${scrollPct * 100}%`, borderRadius: '1px' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Below fold */}
      <section style={{ background: '#F5F1EC', padding: '6rem 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>You made it</div>
          <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.1, marginBottom: '1.25rem' }}>
            Normal content below.
          </div>
          <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '0 auto 1.5rem' }} />
          <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.85, marginBottom: '2rem' }}>
            The animation lives entirely in the scroll section above. Once through, the page continues as normal.
          </p>
          <Link href="/" style={{ display: 'inline-block', padding: '0.8rem 2rem', background: '#0F1E14', color: '#F5F1EC', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', textDecoration: 'none' }}>
            Back to homepage
          </Link>
        </div>
      </section>

    </div>
  )
}
