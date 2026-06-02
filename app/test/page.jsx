'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// Path constrained to right ~20% of the 1200-wide viewBox (x: 960–1160)
const PATH_DESKTOP = 'M 1060 20 C 1160 120 940 230 1060 360 C 1170 490 1160 590 1040 690 C 950 760 1140 790 1060 800'
const PATH_MOBILE  = 'M 600 20 C 900 140 290 270 600 400 C 900 530 890 630 600 730 C 330 810 700 800 600 800'

const BAKE_STEPS = 600   // pre-calculated points — O(1) lookup per scroll frame

export default function TestPage() {
  const [isMobile, setIsMobile] = useState(false)

  const containerRef = useRef(null)
  const pathRef      = useRef(null)   // invisible SVG path for initial bake
  const pointsRef    = useRef([])     // pre-baked { x, y, angle }[]
  const carRef       = useRef(null)   // the positioned div (car)
  const progressRef  = useRef(null)
  const scrollCueRef = useRef(null)
  const text1Ref     = useRef(null)
  const text2Ref     = useRef(null)
  const text3Ref     = useRef(null)
  const rafRef       = useRef(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Bake path points whenever path changes
  function bakePoints(pathEl) {
    const total = pathEl.getTotalLength()
    const pts = []
    for (let i = 0; i <= BAKE_STEPS; i++) {
      const len = (i / BAKE_STEPS) * total
      const a = pathEl.getPointAtLength(len)
      const b = pathEl.getPointAtLength(Math.min(len + 4, total))
      pts.push({ x: a.x, y: a.y, angle: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI })
    }
    pointsRef.current = pts
  }

  useEffect(() => {
    // Bake points once after mount (pathRef is the hidden SVG path)
    if (pathRef.current) bakePoints(pathRef.current)

    function update() {
      if (!containerRef.current || !pointsRef.current.length || !carRef.current) return

      const rect     = containerRef.current.getBoundingClientRect()
      const maxScroll = containerRef.current.offsetHeight - window.innerHeight
      const p         = Math.max(0, Math.min(1, -rect.top / maxScroll))

      // O(1) lookup
      const pts = pointsRef.current
      const idx  = Math.min(Math.round(p * (pts.length - 1)), pts.length - 1)
      const { x, y, angle } = pts[idx]

      // Convert SVG coords (viewBox 1200×800) → viewport %
      // With slice, scale = max(vw/1200, vh/800)
      const vw = window.innerWidth, vh = window.innerHeight
      const scale  = Math.max(vw / 1200, vh / 800)
      const offX   = (vw - 1200 * scale) / 2
      const offY   = (vh - 800  * scale) / 2
      const screenX = x * scale + offX
      const screenY = y * scale + offY

      // GPU-accelerated: compositor-thread transform, no layout thrash
      carRef.current.style.transform = `translate(${screenX}px, ${screenY}px) rotate(${angle}deg)`

      // Progress bar
      if (progressRef.current) progressRef.current.style.height = `${p * 100}%`
      if (scrollCueRef.current) scrollCueRef.current.style.opacity = Math.max(0, 1 - p * 8)

      // Text fade chapters
      if (text1Ref.current) {
        text1Ref.current.style.opacity = Math.max(0, 1 - p * 3).toString()
        text1Ref.current.style.transform = `translateY(${p * -60}px)`
      }
      if (text2Ref.current) {
        const o = Math.max(0, Math.min(1, (p - 0.3) * 5)) * Math.max(0, 1 - (p - 0.62) * 5)
        text2Ref.current.style.opacity = o.toString()
        text2Ref.current.style.transform = `translateY(${Math.max(0, (0.3 - p) * 80)}px)`
      }
      if (text3Ref.current) {
        const o = Math.max(0, Math.min(1, (p - 0.72) * 5))
        text3Ref.current.style.opacity = o.toString()
        text3Ref.current.style.transform = `translateY(${Math.max(0, (0.72 - p) * 80)}px)`
      }
    }

    update()

    function onScroll() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isMobile])

  const pathD = isMobile ? PATH_MOBILE : PATH_DESKTOP

  return (
    <div style={{ background: '#0F1E14', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.5rem', height: '60px', background: 'rgba(10,20,13,0.85)', backdropFilter: 'blur(12px)', borderBottom: '0.5px solid rgba(197,168,130,0.12)' }}>
        <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.1rem', fontWeight: '300', color: '#F5F1EC', letterSpacing: '0.04em' }}>Canvas Routes</span>
        <Link href="/" style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)', textDecoration: 'none' }}>← Back</Link>
      </nav>

      {/* Hero */}
      <section style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 1.5rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.5),transparent)' }} />
        <div style={{ fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1.5rem' }}>Canvas Routes · Season 2026</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.8rem,6vw,5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.05, letterSpacing: '-0.01em', marginBottom: '1.5rem' }}>
          Every road<br />worth driving.
        </h1>
        <div style={{ width: '36px', height: '0.5px', background: 'rgba(197,168,130,0.5)', marginBottom: '1.5rem' }} />
        <p style={{ fontSize: '15px', color: 'rgba(245,241,236,0.45)', lineHeight: 1.9, maxWidth: '360px', marginBottom: '2.5rem' }}>
          Curated road trips and convoy drives across Quebec and beyond.
        </p>
        <Link href="/membership" style={{ padding: '0.85rem 2.25rem', background: '#c5a882', color: '#0F1E14', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: '600' }}>
          Join Canvas Routes
        </Link>
        <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.3)', marginBottom: '0.4rem' }}>Scroll</div>
          <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="rgba(197,168,130,0.3)" strokeWidth="1.2" strokeLinecap="round">
            <line x1="6" y1="0" x2="6" y2="12"/><polyline points="2 8 6 12 10 8"/>
          </svg>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'rgba(197,168,130,0.08)' }} />
      </section>

      {/* Car animation section */}
      <div ref={containerRef} style={{ height: '700vh', position: 'relative' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 70% at 25% 50%, rgba(197,168,130,0.04) 0%, transparent 70%)' }} />

          {/* Text chapters */}
          {!isMobile && (
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '75%', zIndex: 2, pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
              <div ref={text1Ref} style={{ position: 'absolute', left: '3rem', right: '1rem', opacity: 1 }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1rem' }}>The Route</div>
                <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,3rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>Backroads.<br />No shortcuts.</h2>
                <p style={{ fontSize: '13px', color: 'rgba(245,241,236,0.4)', lineHeight: 1.9, maxWidth: '300px' }}>Winding two-lane roads, elevation changes and long sweeping corners — the kind of roads you came for.</p>
              </div>
              <div ref={text2Ref} style={{ position: 'absolute', left: '3rem', right: '1rem', opacity: 0 }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1rem' }}>The Experience</div>
                <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,3rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>Every detail<br />is handled.</h2>
                <p style={{ fontSize: '13px', color: 'rgba(245,241,236,0.4)', lineHeight: 1.9, maxWidth: '300px' }}>Breakfast before departure. Stops along the route. Your car photographed on the road.</p>
              </div>
              <div ref={text3Ref} style={{ position: 'absolute', left: '3rem', right: '1rem', opacity: 0 }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1rem' }}>Membership</div>
                <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,3rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>Your seat<br />is held.</h2>
                <p style={{ fontSize: '13px', color: 'rgba(245,241,236,0.4)', lineHeight: 1.9, maxWidth: '300px' }}>Members get first access to every route before public registration opens.</p>
              </div>
            </div>
          )}

          {isMobile && (
            <div ref={text1Ref} style={{ position: 'absolute', top: '80px', left: 0, right: 0, textAlign: 'center', padding: '0 1.5rem', zIndex: 2, opacity: 1, pointerEvents: 'none' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '0.75rem' }}>The Route</div>
              <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,7vw,2.8rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.08 }}>Backroads. No shortcuts.</h2>
            </div>
          )}

          {/* Road SVG — static, never updates */}
          <svg viewBox="0 0 1200 800" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid slice">
            {/* Hidden path used only for pre-baking at mount */}
            <path key={pathD} ref={pathRef} d={pathD} fill="none" stroke="none" />
            {!isMobile && <line x1="552" y1="0" x2="552" y2="800" stroke="rgba(197,168,130,0.05)" strokeWidth="1" />}
            <path d={pathD} fill="none" stroke="rgba(197,168,130,0.05)" strokeWidth="30" strokeLinecap="round" />
            <path d={pathD} fill="none" stroke="rgba(197,168,130,0.1)"  strokeWidth="8"  strokeLinecap="round" />
            <path d={pathD} fill="none" stroke="rgba(12,24,16,0.9)"    strokeWidth="5"  strokeLinecap="round" />
            <path d={pathD} fill="none" stroke="rgba(197,168,130,0.5)" strokeWidth="1"  strokeLinecap="round" strokeDasharray="10 14" />
          </svg>

          {/* Car — positioned div, GPU-composited, no SVG overhead */}
          <div
            ref={carRef}
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '32px', height: '14px',
              marginLeft: '-16px', marginTop: '-7px',   // centre anchor
              willChange: 'transform',
              pointerEvents: 'none',
            }}
          >
            <svg viewBox="0 0 32 14" width="32" height="14">
              {/* Shadow */}
              <ellipse cx="16" cy="13" rx="14" ry="2" fill="rgba(0,0,0,0.4)" />
              {/* Body */}
              <rect x="1" y="5" width="30" height="8" rx="2" fill="#c5a882" />
              {/* Cabin */}
              <path d="M 7 5 L 10 1 L 22 1 L 25 5 Z" fill="#c5a882" />
              {/* Window */}
              <path d="M 9 5 L 11 2 L 21 2 L 23 5 Z" fill="rgba(10,20,14,0.75)" />
              {/* Wheels */}
              <circle cx="7"  cy="13" r="3" fill="#0F1E14" stroke="#F5F1EC" strokeWidth="1" />
              <circle cx="25" cy="13" r="3" fill="#0F1E14" stroke="#F5F1EC" strokeWidth="1" />
              {/* Headlight */}
              <rect x="29" y="7" width="2.5" height="3" rx="0.5" fill="rgba(255,245,180,0.9)" />
            </svg>
          </div>

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
          <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1.1, marginBottom: '1.25rem' }}>Normal content lives here.</div>
          <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '0 auto 1.5rem' }} />
          <Link href="/" style={{ display: 'inline-block', padding: '0.8rem 2rem', background: '#0F1E14', color: '#F5F1EC', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', textDecoration: 'none' }}>
            Back to homepage
          </Link>
        </div>
      </section>

    </div>
  )
}
