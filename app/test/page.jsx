'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const PATH_DESKTOP = 'M 900 30 C 1120 130 660 230 900 360 C 1120 490 1100 590 880 690 C 680 780 1060 800 900 800'
const PATH_MOBILE  = 'M 600 30 C 900 150 280 270 600 400 C 900 530 900 630 600 730 C 320 810 700 800 600 800'

function CarSVG() {
  return (
    <g transform="translate(-93,-35) scale(1.6)">
      <ellipse cx="58" cy="43" rx="52" ry="6" fill="rgba(0,0,0,0.45)" />
      <path d="M 8 30 Q 8 37 16 37 L 100 37 Q 108 37 108 30 L 108 23 Q 104 19 96 19 L 20 19 Q 12 19 8 23 Z" fill="#c5a882" />
      <path d="M 24 19 L 34 7 Q 38 3 44 3 L 76 3 Q 82 3 86 7 L 96 19 Z" fill="#c5a882" />
      <path d="M 36 18 L 44 6 L 76 6 L 84 18 Z" fill="rgba(10,20,14,0.8)" />
      <line x1="60" y1="6" x2="60" y2="18" stroke="rgba(197,168,130,0.3)" strokeWidth="0.8" />
      <path d="M 8 30 Q 8 19 28 19 L 42 19 Q 50 19 50 30" fill="#0F1E14" />
      <path d="M 66 30 Q 66 19 76 19 L 90 19 Q 108 19 108 30" fill="#0F1E14" />
      <circle cx="29" cy="35" r="10" fill="#0F1E14" stroke="#F5F1EC" strokeWidth="2" />
      <circle cx="29" cy="35" r="4.5" fill="#1a1a1a" stroke="rgba(245,241,236,0.5)" strokeWidth="1" />
      <circle cx="87" cy="35" r="10" fill="#0F1E14" stroke="#F5F1EC" strokeWidth="2" />
      <circle cx="87" cy="35" r="4.5" fill="#1a1a1a" stroke="rgba(245,241,236,0.5)" strokeWidth="1" />
      <path d="M 106 23 L 114 26 L 114 31 L 106 31 Z" fill="rgba(255,245,200,0.95)" />
    </g>
  )
}

export default function TestPage() {
  const [isMobile, setIsMobile] = useState(false)

  // Refs for direct DOM manipulation — no React re-render on scroll
  const containerRef  = useRef(null)
  const pathRef       = useRef(null)
  const carGroupRef   = useRef(null)
  const progressRef   = useRef(null)
  const scrollCueRef  = useRef(null)
  const text1Ref      = useRef(null)
  const text2Ref      = useRef(null)
  const text3Ref      = useRef(null)
  const rafRef        = useRef(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    function update() {
      if (!containerRef.current || !pathRef.current || !carGroupRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const maxScroll = containerRef.current.offsetHeight - window.innerHeight
      const p = Math.max(0, Math.min(1, -rect.top / maxScroll))

      // ── Car position: direct DOM, zero React overhead ──
      const totalLen = pathRef.current.getTotalLength()
      const len = p * totalLen
      const pt  = pathRef.current.getPointAtLength(len)
      const pt2 = pathRef.current.getPointAtLength(Math.min(len + 6, totalLen))
      const angle = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI
      carGroupRef.current.setAttribute('transform', `translate(${pt.x},${pt.y}) rotate(${angle})`)

      // Progress bar
      if (progressRef.current) progressRef.current.style.height = `${p * 100}%`

      // Scroll cue
      if (scrollCueRef.current) scrollCueRef.current.style.opacity = Math.max(0, 1 - p * 8)

      // Text chapters — fade in/out based on scroll position
      if (text1Ref.current) {
        const o = Math.max(0, 1 - p * 3)
        text1Ref.current.style.opacity = o
        text1Ref.current.style.transform = `translateY(${p * -60}px)`
      }
      if (text2Ref.current) {
        const o = Math.max(0, Math.min(1, (p - 0.3) * 5)) * Math.max(0, 1 - (p - 0.6) * 5)
        text2Ref.current.style.opacity = o
        text2Ref.current.style.transform = `translateY(${Math.max(0, (0.3 - p) * 80)}px)`
      }
      if (text3Ref.current) {
        const o = Math.max(0, Math.min(1, (p - 0.72) * 5))
        text3Ref.current.style.opacity = o
        text3Ref.current.style.transform = `translateY(${Math.max(0, (0.72 - p) * 80)}px)`
      }
    }

    // Initial draw
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
  }, [isMobile]) // re-initialise when layout switches

  const pathD = isMobile ? PATH_MOBILE : PATH_DESKTOP

  return (
    <div style={{ background: '#0F1E14', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.5rem', height: '60px', background: 'rgba(10,20,13,0.85)', backdropFilter: 'blur(12px)', borderBottom: '0.5px solid rgba(197,168,130,0.12)' }}>
        <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.1rem', fontWeight: '300', color: '#F5F1EC', letterSpacing: '0.04em' }}>Canvas Routes</span>
        <Link href="/" style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)', textDecoration: 'none' }}>← Back</Link>
      </nav>

      {/* ── HERO — full viewport, then car section begins ── */}
      <section style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 1.5rem', position: 'relative', borderBottom: '0.5px solid rgba(197,168,130,0.12)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.5),transparent)' }} />
        <div style={{ fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1.5rem' }}>Canvas Routes · Season 2026</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.8rem,6vw,5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.05, letterSpacing: '-0.01em', marginBottom: '1.5rem' }}>
          Every road<br />worth driving.
        </h1>
        <div style={{ width: '36px', height: '0.5px', background: 'rgba(197,168,130,0.5)', marginBottom: '1.5rem' }} />
        <p style={{ fontSize: '15px', color: 'rgba(245,241,236,0.45)', lineHeight: 1.9, maxWidth: '380px', marginBottom: '2.5rem' }}>
          Curated road trips and convoy drives across Quebec and beyond.
        </p>
        <Link href="/membership" style={{ padding: '0.85rem 2.25rem', background: '#c5a882', color: '#0F1E14', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: '600' }}>
          Join Canvas Routes
        </Link>
        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.3)', marginBottom: '0.4rem' }}>Scroll</div>
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="rgba(197,168,130,0.3)" strokeWidth="1.2" strokeLinecap="round">
            <line x1="6" y1="0" x2="6" y2="12"/><polyline points="2 8 6 12 10 8"/>
          </svg>
        </div>
      </section>

      {/* ── CAR ANIMATION — 700vh scroll space ── */}
      <div ref={containerRef} style={{ height: '700vh', position: 'relative' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', background: '#0F1E14' }}>

          {/* Atmosphere */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 70% at 25% 50%, rgba(197,168,130,0.04) 0%, transparent 70%)' }} />

          {/* Text chapters — desktop left column */}
          {!isMobile && (
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '46%', zIndex: 2, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>

              <div ref={text1Ref} style={{ position: 'absolute', left: '3rem', right: '1rem', opacity: 1 }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1rem' }}>The Route</div>
                <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,3rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>
                  Backroads.<br />No shortcuts.
                </h2>
                <p style={{ fontSize: '13px', color: 'rgba(245,241,236,0.4)', lineHeight: 1.9, maxWidth: '280px' }}>
                  We plan every route to avoid highways. Winding two-lane roads, elevation changes and long sweeping corners.
                </p>
              </div>

              <div ref={text2Ref} style={{ position: 'absolute', left: '3rem', right: '1rem', opacity: 0 }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1rem' }}>The Experience</div>
                <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,3rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>
                  Every detail<br />is handled.
                </h2>
                <p style={{ fontSize: '13px', color: 'rgba(245,241,236,0.4)', lineHeight: 1.9, maxWidth: '280px' }}>
                  Breakfast before departure. Stops along the route. Group lunch. Your car photographed on the road.
                </p>
              </div>

              <div ref={text3Ref} style={{ position: 'absolute', left: '3rem', right: '1rem', opacity: 0 }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1rem' }}>Membership</div>
                <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,3rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>
                  Your seat<br />is held.
                </h2>
                <p style={{ fontSize: '13px', color: 'rgba(245,241,236,0.4)', lineHeight: 1.9, maxWidth: '280px' }}>
                  Members get first access to every route before public registration opens.
                </p>
              </div>

            </div>
          )}

          {/* Mobile: single text at top */}
          {isMobile && (
            <div ref={text1Ref} style={{ position: 'absolute', top: '80px', left: 0, right: 0, textAlign: 'center', padding: '0 1.5rem', zIndex: 2, opacity: 1, pointerEvents: 'none' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '0.75rem' }}>The Route</div>
              <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,7vw,2.8rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.08 }}>
                Backroads. No shortcuts.
              </h2>
            </div>
          )}

          {/* SVG canvas */}
          <svg
            viewBox="0 0 1200 800"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            preserveAspectRatio="xMidYMid slice"
          >
            {/* Measurement path — invisible */}
            <path key={pathD} ref={pathRef} d={pathD} fill="none" stroke="none" />

            {/* Divider line desktop */}
            {!isMobile && <line x1="552" y1="0" x2="552" y2="800" stroke="rgba(197,168,130,0.05)" strokeWidth="1" />}

            {/* Road: glow → edge → surface → dashes */}
            <path d={pathD} fill="none" stroke="rgba(197,168,130,0.05)" strokeWidth="56" strokeLinecap="round" />
            <path d={pathD} fill="none" stroke="rgba(197,168,130,0.11)" strokeWidth="20" strokeLinecap="round" />
            <path d={pathD} fill="none" stroke="rgba(12,24,16,0.85)"   strokeWidth="13" strokeLinecap="round" />
            <path d={pathD} fill="none" stroke="rgba(197,168,130,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="14 18" />

            {/* Car group — position set via direct DOM ref, not state */}
            <g ref={carGroupRef} transform="translate(900,30) rotate(80)">
              <CarSVG />
            </g>
          </svg>

          {/* Scroll cue */}
          <div ref={scrollCueRef} style={{ position: 'absolute', bottom: '1.75rem', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', zIndex: 3 }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.3)', marginBottom: '0.4rem' }}>Keep scrolling</div>
            <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="rgba(197,168,130,0.25)" strokeWidth="1.2" strokeLinecap="round">
              <line x1="6" y1="0" x2="6" y2="12"/><polyline points="2 8 6 12 10 8"/>
            </svg>
          </div>

          {/* Progress bar */}
          <div style={{ position: 'absolute', bottom: '1.75rem', right: '1.5rem', zIndex: 3 }}>
            <div style={{ width: '2px', height: '70px', background: 'rgba(197,168,130,0.1)', borderRadius: '1px', overflow: 'hidden' }}>
              <div ref={progressRef} style={{ width: '100%', background: '#c5a882', height: '0%', borderRadius: '1px' }} />
            </div>
          </div>

        </div>
      </div>

      {/* Below fold */}
      <section style={{ background: '#F5F1EC', padding: '6rem 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>You made it</div>
          <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.1, marginBottom: '1.25rem' }}>
            Normal content lives here.
          </div>
          <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '0 auto 1.5rem' }} />
          <Link href="/" style={{ display: 'inline-block', padding: '0.8rem 2rem', background: '#0F1E14', color: '#F5F1EC', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', textDecoration: 'none' }}>
            Back to homepage
          </Link>
        </div>
      </section>

    </div>
  )
}
