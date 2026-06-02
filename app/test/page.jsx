'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const STEPS = 500

function buildPoints(isMobile) {
  const vw     = window.innerWidth
  const vh     = window.innerHeight
  const cx     = isMobile ? vw * 0.50 : vw * 0.87
  const amp    = isMobile ? vw * 0.18 : vw * 0.05
  const cycles = 2.5

  return Array.from({ length: STEPS + 1 }, (_, i) => {
    const t     = i / STEPS
    const x     = cx + amp * Math.sin(t * cycles * Math.PI * 2)
    const y     = t * vh
    const dx    = amp * cycles * Math.PI * 2 * Math.cos(t * cycles * Math.PI * 2)
    const dy    = vh
    const angle = Math.atan2(dy, dx) * 180 / Math.PI
    return { x, y, angle }
  })
}

function polyStr(pts) {
  return pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

export default function TestPage() {
  const [isMobile, setIsMobile] = useState(false)

  // All updates are direct DOM — no scroll-driven state
  const containerRef = useRef(null)
  const pointsRef    = useRef([])
  const carRef       = useRef(null)
  const progressRef  = useRef(null)
  const scrollCueRef = useRef(null)
  const text1Ref     = useRef(null)
  const text2Ref     = useRef(null)
  const text3Ref     = useRef(null)
  const rafRef       = useRef(null)
  // Road SVG polyline refs — updated via setAttribute, no React state
  const rl1 = useRef(null), rl2 = useRef(null), rl3 = useRef(null), rl4 = useRef(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    function init() {
      const pts  = buildPoints(isMobile)
      pointsRef.current = pts
      const poly = polyStr(pts)
      // Update road layers directly — no state, no re-render
      ;[rl1, rl2, rl3, rl4].forEach(r => r.current?.setAttribute('points', poly))
      // Place car at path start
      if (carRef.current) {
        const { x, y, angle } = pts[0]
        carRef.current.style.transform = `translate(${x}px,${y}px) rotate(${angle}deg)`
      }
    }

    function update() {
      const pts = pointsRef.current
      if (!pts.length || !carRef.current || !containerRef.current) return

      // Container starts at top of page so scrollY IS the scroll offset into the container
      const totalScroll = containerRef.current.offsetHeight - window.innerHeight
      const p = Math.max(0, Math.min(1, window.scrollY / totalScroll))

      const idx           = Math.min(Math.round(p * STEPS), STEPS)
      const { x, y, angle } = pts[idx]
      carRef.current.style.transform = `translate(${x}px,${y}px) rotate(${angle}deg)`

      if (progressRef.current)  progressRef.current.style.height  = `${p * 100}%`
      if (scrollCueRef.current) scrollCueRef.current.style.opacity = `${Math.max(0, 1 - p * 8)}`

      if (text1Ref.current) {
        text1Ref.current.style.opacity   = `${Math.max(0, 1 - p * 3)}`
        text1Ref.current.style.transform = `translateY(${p * -50}px)`
      }
      if (text2Ref.current) {
        const o = Math.max(0, Math.min(1, (p - 0.3) * 5)) * Math.max(0, 1 - (p - 0.62) * 5)
        text2Ref.current.style.opacity   = `${o}`
        text2Ref.current.style.transform = `translateY(${Math.max(0, (0.3 - p) * 80)}px)`
      }
      if (text3Ref.current) {
        text3Ref.current.style.opacity   = `${Math.max(0, Math.min(1, (p - 0.72) * 5))}`
        text3Ref.current.style.transform = `translateY(${Math.max(0, (0.72 - p) * 80)}px)`
      }
    }

    init()
    update()

    function onScroll() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(update)
    }
    function onResize() { init(); update() }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isMobile])

  return (
    <div style={{ background: '#0F1E14', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.5rem', height: '60px', background: 'rgba(10,20,13,0.9)', backdropFilter: 'blur(12px)', borderBottom: '0.5px solid rgba(197,168,130,0.12)' }}>
        <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.1rem', fontWeight: '300', color: '#F5F1EC', letterSpacing: '0.04em' }}>Canvas Routes</span>
        <Link href="/" style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(245,241,236,0.4)', textDecoration: 'none' }}>← Back</Link>
      </nav>

      {/*
        Container starts at the very top of the page.
        Road is visible immediately — no hero section above it.
        Hero content is layered INSIDE the sticky panel, fades as car moves.
      */}
      <div ref={containerRef} style={{ height: '800vh', position: 'relative' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 60% at 20% 50%, rgba(197,168,130,0.04) 0%, transparent 70%)' }} />

          {/* Road — SVG has no viewBox, coordinates are real pixels */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
            <polyline ref={rl1} fill="none" stroke="rgba(197,168,130,0.06)" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
            <polyline ref={rl2} fill="none" stroke="rgba(197,168,130,0.12)" strokeWidth="6"  strokeLinecap="round" strokeLinejoin="round" />
            <polyline ref={rl3} fill="none" stroke="rgba(10,20,14,0.95)"    strokeWidth="4"  strokeLinecap="round" strokeLinejoin="round" />
            <polyline ref={rl4} fill="none" stroke="rgba(197,168,130,0.55)" strokeWidth="1"  strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 12" />
          </svg>

          {/* Car — positioned div on the compositor layer */}
          <div ref={carRef} style={{ position: 'absolute', top: 0, left: 0, width: '28px', height: '12px', marginLeft: '-14px', marginTop: '-6px', willChange: 'transform', pointerEvents: 'none', transformOrigin: '50% 50%' }}>
            <svg viewBox="0 0 28 12" width="28" height="12" style={{ display: 'block' }}>
              <ellipse cx="14" cy="11.5" rx="12" ry="1.5" fill="rgba(0,0,0,0.4)" />
              <rect    x="1"  y="4"     width="26" height="7" rx="2"                fill="#c5a882" />
              <path    d="M 6 4 L 9 1 L 19 1 L 22 4 Z"                              fill="#c5a882" />
              <path    d="M 7.5 4 L 10 1.5 L 18 1.5 L 20.5 4 Z"                    fill="rgba(10,20,14,0.7)" />
              <circle  cx="6"  cy="11" r="2.5" fill="#0F1E14" stroke="#F5F1EC"      strokeWidth="1" />
              <circle  cx="22" cy="11" r="2.5" fill="#0F1E14" stroke="#F5F1EC"      strokeWidth="1" />
              <rect    x="25.5" y="6"  width="2" height="2.5" rx="0.4"              fill="rgba(255,245,180,0.95)" />
            </svg>
          </div>

          {/* Chapter 1 — hero / intro, visible at scroll start */}
          <div ref={text1Ref} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 3rem', zIndex: 2, pointerEvents: 'none' }}>
            <div style={{ maxWidth: isMobile ? '100%' : '45%' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1.25rem' }}>Canvas Routes · Season 2026</div>
              <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.5rem,5vw,4.5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.06, letterSpacing: '-0.01em', marginBottom: '1.25rem' }}>
                Every road<br />worth driving.
              </h1>
              <div style={{ width: '36px', height: '0.5px', background: 'rgba(197,168,130,0.5)', marginBottom: '1.25rem' }} />
              <p style={{ fontSize: '14px', color: 'rgba(245,241,236,0.45)', lineHeight: 1.9, maxWidth: '320px', marginBottom: '2rem' }}>
                Curated road trips and convoy drives across Quebec and beyond.
              </p>
              <Link href="/membership" style={{ display: 'inline-block', padding: '0.85rem 2.25rem', background: '#c5a882', color: '#0F1E14', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: '600', pointerEvents: 'auto' }}>
                Join Canvas Routes
              </Link>
            </div>
          </div>

          {/* Chapter 2 */}
          {!isMobile && (
            <div ref={text2Ref} style={{ position: 'absolute', left: '3rem', top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 2, pointerEvents: 'none', opacity: 0 }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1rem' }}>The Experience</div>
              <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,3rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>Every detail<br />is handled.</h2>
              <p style={{ fontSize: '13px', color: 'rgba(245,241,236,0.4)', lineHeight: 1.9, maxWidth: '280px' }}>Breakfast, stops, lunch, farewell drinks, and your car photographed on the road.</p>
            </div>
          )}

          {/* Chapter 3 */}
          {!isMobile && (
            <div ref={text3Ref} style={{ position: 'absolute', left: '3rem', top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 2, pointerEvents: 'none', opacity: 0 }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1rem' }}>Membership</div>
              <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,3.5vw,3rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.1, marginBottom: '1rem' }}>Your seat<br />is held.</h2>
              <p style={{ fontSize: '13px', color: 'rgba(245,241,236,0.4)', lineHeight: 1.9, maxWidth: '280px' }}>Members get first access to every route before public registration opens.</p>
            </div>
          )}

          {/* Scroll cue */}
          <div ref={scrollCueRef} style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', zIndex: 3 }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.3)', marginBottom: '0.4rem' }}>Scroll</div>
            <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="rgba(197,168,130,0.25)" strokeWidth="1.2" strokeLinecap="round">
              <line x1="6" y1="0" x2="6" y2="12"/><polyline points="2 8 6 12 10 8"/>
            </svg>
          </div>

          {/* Progress bar */}
          <div style={{ position: 'absolute', bottom: '2rem', right: '1.5rem', zIndex: 3 }}>
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
          <Link href="/" style={{ display: 'inline-block', padding: '0.8rem 2rem', background: '#0F1E14', color: '#F5F1EC', fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase', textDecoration: 'none' }}>Back to homepage</Link>
        </div>
      </section>

    </div>
  )
}
