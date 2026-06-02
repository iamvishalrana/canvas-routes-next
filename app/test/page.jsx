'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// Wavy vertical path — right side of screen, top → bottom
// SVG viewBox 0 0 1200 800
const PATH_D = [
  'M 900 60',
  'C 1060 140, 720 260, 880 380',
  'C 1040 500, 1080 580, 880 680',
  'C 720 760, 960 790, 900 800',
].join(' ')

function CarSVG() {
  // Scaled up 1.6× so it's clearly visible. Front faces right.
  return (
    <g transform="translate(-93, -35) scale(1.6)">
      {/* Drop shadow */}
      <ellipse cx="58" cy="42" rx="52" ry="6" fill="rgba(0,0,0,0.5)" />
      {/* Body lower — gold so it pops on dark bg */}
      <path d="M 8 30 Q 8 37 16 37 L 100 37 Q 108 37 108 30 L 108 23 Q 104 19 96 19 L 20 19 Q 12 19 8 23 Z"
        fill="#c5a882" stroke="rgba(197,168,130,0.4)" strokeWidth="0.5" />
      {/* Body upper */}
      <path d="M 24 19 L 34 7 Q 38 3 44 3 L 76 3 Q 82 3 86 7 L 96 19 Z"
        fill="#c5a882" stroke="rgba(197,168,130,0.4)" strokeWidth="0.5" />
      {/* Window — dark tint */}
      <path d="M 36 18 L 44 6 L 76 6 L 84 18 Z" fill="rgba(10,20,14,0.75)" />
      <line x1="60" y1="6" x2="60" y2="18" stroke="rgba(197,168,130,0.3)" strokeWidth="0.8" />
      {/* Wheel arches */}
      <path d="M 8 30 Q 8 19 28 19 L 42 19 Q 50 19 50 30" fill="#0F1E14" />
      <path d="M 66 30 Q 66 19 76 19 L 90 19 Q 108 19 108 30" fill="#0F1E14" />
      {/* Wheels */}
      <circle cx="29" cy="35" r="10" fill="#0F1E14" stroke="#F5F1EC" strokeWidth="2" />
      <circle cx="29" cy="35" r="4.5" fill="#1a1a1a" stroke="rgba(245,241,236,0.5)" strokeWidth="1" />
      <circle cx="87" cy="35" r="10" fill="#0F1E14" stroke="#F5F1EC" strokeWidth="2" />
      <circle cx="87" cy="35" r="4.5" fill="#1a1a1a" stroke="rgba(245,241,236,0.5)" strokeWidth="1" />
      {/* Headlight */}
      <path d="M 106 23 L 114 26 L 114 31 L 106 31 Z" fill="rgba(255,245,200,0.9)" />
      {/* Dark lower trim line */}
      <line x1="10" y1="28" x2="96" y2="28" stroke="rgba(10,20,14,0.6)" strokeWidth="1.5" />
    </g>
  )
}

export default function TestPage() {
  const containerRef = useRef(null)
  const pathRef = useRef(null)
  const rafRef = useRef(null)
  const [carPos, setCarPos] = useState({ x: 900, y: 60, angle: 80 })
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

  return (
    <div style={{ background: '#0F1E14', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2.5rem', height: '64px', background: 'rgba(10,20,13,0.7)', backdropFilter: 'blur(12px)', borderBottom: '0.5px solid rgba(197,168,130,0.12)' }}>
        <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.1rem', fontWeight: '300', color: '#F5F1EC', letterSpacing: '0.04em' }}>Canvas Routes</span>
        <Link href="/" style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)', textDecoration: 'none' }}>← Back to site</Link>
      </nav>

      {/* ── Scroll container ── */}
      <div ref={containerRef} style={{ height: '400vh', position: 'relative' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

          {/* Subtle background texture */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 30% 50%, rgba(197,168,130,0.04) 0%, transparent 70%)' }} />

          {/* Left — text content */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 4rem 0 3rem', zIndex: 2 }}>

            <div style={{ opacity: Math.max(0, 1 - scrollPct * 2.5), transform: `translateY(${scrollPct * -40}px)`, transition: 'none' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.6)', marginBottom: '1.5rem' }}>
                Canvas Routes · Season 2026
              </div>
              <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.8rem,4.5vw,4rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.08, letterSpacing: '-0.01em', marginBottom: '1.75rem' }}>
                Every road<br />worth driving<br />starts here.
              </h1>
              <div style={{ width: '36px', height: '0.5px', background: 'rgba(197,168,130,0.5)', marginBottom: '1.75rem' }} />
              <p style={{ fontSize: '14px', color: 'rgba(245,241,236,0.5)', lineHeight: '1.9', maxWidth: '340px', marginBottom: '2.5rem' }}>
                Curated road trips, scenic convoy drives and invite-only car meets across Quebec and beyond.
              </p>
              <Link href="/membership" style={{ display: 'inline-block', padding: '0.85rem 2rem', background: '#c5a882', color: '#0F1E14', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: '600' }}>
                Join Canvas Routes
              </Link>
            </div>

            {/* Second message — fades in mid-scroll */}
            <div style={{ position: 'absolute', left: '3rem', right: '1rem', opacity: Math.max(0, Math.min(1, (scrollPct - 0.3) * 4)), transform: `translateY(${Math.max(0, (0.3 - scrollPct) * 60)}px)` }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.6)', marginBottom: '1rem' }}>Road Trips</div>
              <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,3rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>
                Backroads.<br />No shortcuts.
              </h2>
              <p style={{ fontSize: '14px', color: 'rgba(245,241,236,0.45)', lineHeight: '1.9', maxWidth: '300px' }}>
                Winding two-lane roads, elevation changes and long sweeping corners — the kind of roads you came for.
              </p>
            </div>
          </div>

          {/* Right — SVG road + car */}
          <svg
            viewBox="0 0 1200 800"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            preserveAspectRatio="xMidYMid slice"
          >
            {/* Hidden path for measurement */}
            <path ref={pathRef} d={PATH_D} fill="none" stroke="none" />

            {/* Vertical divider — subtle split between left content and right road */}
            <line x1="600" y1="0" x2="600" y2="800" stroke="rgba(197,168,130,0.06)" strokeWidth="1" />

            {/* Road glow */}
            <path d={PATH_D} fill="none" stroke="rgba(197,168,130,0.05)" strokeWidth="40" strokeLinecap="round" />
            {/* Road edges */}
            <path d={PATH_D} fill="none" stroke="rgba(197,168,130,0.1)" strokeWidth="14" strokeLinecap="round" />
            {/* Road surface */}
            <path d={PATH_D} fill="none" stroke="rgba(15,30,20,0.6)" strokeWidth="10" strokeLinecap="round" />
            {/* Centre dashes */}
            <path d={PATH_D} fill="none" stroke="rgba(197,168,130,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="12 16" />

            {/* Car */}
            <g transform={`translate(${carPos.x}, ${carPos.y}) rotate(${carPos.angle})`}>
              <CarSVG />
            </g>
          </svg>

          {/* Scroll cue */}
          <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', opacity: Math.max(0, 1 - scrollPct * 5), textAlign: 'center', zIndex: 3 }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.35)', marginBottom: '0.5rem' }}>Scroll</div>
            <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="rgba(197,168,130,0.3)" strokeWidth="1.2" strokeLinecap="round">
              <line x1="6" y1="0" x2="6" y2="12"/><polyline points="2 8 6 12 10 8"/>
            </svg>
          </div>

          {/* Progress bar */}
          <div style={{ position: 'absolute', bottom: '2rem', right: '2rem', zIndex: 3 }}>
            <div style={{ width: '2px', height: '80px', background: 'rgba(197,168,130,0.1)', borderRadius: '1px', overflow: 'hidden' }}>
              <div style={{ width: '100%', background: '#c5a882', height: `${scrollPct * 100}%`, borderRadius: '1px' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Below fold */}
      <section style={{ background: '#F5F1EC', padding: '7rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>And the page continues</div>
          <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.1, marginBottom: '1.5rem' }}>
            Normal content lives below.
          </div>
          <div style={{ width: '32px', height: '0.5px', background: '#c5a882', margin: '0 auto 1.5rem' }} />
          <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.9, marginBottom: '2.5rem' }}>
            Once the scroll section is done the page continues exactly as normal. The two coexist without any layout impact.
          </p>
          <Link href="/" style={{ display: 'inline-block', padding: '0.8rem 2rem', background: '#0F1E14', color: '#F5F1EC', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', textDecoration: 'none' }}>Back to homepage</Link>
        </div>
      </section>

    </div>
  )
}
