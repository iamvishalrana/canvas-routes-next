'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'

// ── Typography tokens ────────────────────────────────────────────────────────
// LABEL:   Inter 9px / uppercase / 0.28em              → color varies
// BODY:    Inter 13px / 400 / lineHeight 1.85          → #555 or rgba(245,241,236,0.55)
// SMALL:   Inter 11px / 400 / letterSpacing 0.04em     → #aaa
// CARD H:  Cormorant 1.5rem / 300
// SECTION: Cormorant clamp(2rem,4vw,2.8rem) / 300
// HERO:    Cormorant clamp(3.8rem,8vw,6.5rem) / 300
// PRICE:   Cormorant clamp(3.5rem,6vw,4.5rem) / 300
// ────────────────────────────────────────────────────────────────────────────

const LABEL = { fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'var(--font-inter),sans-serif' }
const BODY  = { fontSize: '14px', lineHeight: '1.85', fontFamily: 'var(--font-inter),sans-serif' }
const SMALL = { fontSize: '12px', letterSpacing: '0.04em', fontFamily: 'var(--font-inter),sans-serif' }

const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } },
}
const stagger = { visible: { transition: { staggerChildren: 0.1 } } }
const fadeIn  = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.9, ease: 'easeOut' } },
}

function FadeUp({ children, delay = 0, style }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1], delay }}
      style={style}>
      {children}
    </motion.div>
  )
}

function StaggerGrid({ children, style }) {
  return (
    <motion.div variants={stagger} initial="hidden" whileInView="visible"
      viewport={{ once: true, margin: '-60px' }} style={style}>
      {children}
    </motion.div>
  )
}

const TIER1 = [
  'Priority access to all Cars & Coffee events',
  'Access to Canvas Routes road trips',
  '10% discount on your next road trip when referring a member',
  '15% discount at one Canvas Routes partner',
  'Canvas Routes car perfume — refreshed every 2 months, picked up at any event throughout the season',
  'Canvas Routes full grain leather keychain',
]

const TIER2_EXTRA = [
  'Exclusive 48hr priority access to all Canvas Routes events before public registration opens',
  '25% referral discount when referring a Tier 2 member',
  'Professional car photoshoot on a Canvas Routes route',
  '$70 one-time discount on one of the next two road trips',
  'Discounts at all Canvas Routes partners',
  'Canvas Routes merchandise baseball cap',
  'Canvas Routes merchandise t-shirt',
]

const PERKS = [
  { label: 'Leather Keychain', sub: 'Full grain leather. Canvas Routes merchandise. Part of your welcome kit on day one.', tier: 1 },
  { label: 'Car Perfume', sub: 'Refreshed every 2 months throughout the season, picked up at any Canvas Routes event.', tier: 1 },
  { label: 'Cap & T-Shirt', sub: 'Canvas Routes merchandise cap and t-shirt included in your Inner Circle welcome kit.', tier: 2 },
  { label: 'Car Photoshoot', sub: 'One professional shoot of your car on a Canvas Routes route.', tier: 2 },
]

function CheckIcon({ gold }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke={gold ? '#c5a882' : '#3B6B2F'} strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: '3px' }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function MembershipContent() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [email, setEmail]       = useState('')
  const [status, setStatus]     = useState(null)
  const [error, setError]       = useState(null)
  const honeypotRef             = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (status === 'loading') return
    setStatus('loading'); setError(null)
    try {
      const res  = await fetch('/api/membership-waitlist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), _hp: honeypotRef.current?.value || '' }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setStatus('success')
      else { setError(data.error || 'Something went wrong. Please try again.'); setStatus('error') }
    } catch { setError('Something went wrong. Please try again.'); setStatus('error') }
  }

  return (
    <div style={{ background: '#F5F1EC', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', minHeight: '100vh' }}>
      <style>{`
        @media(max-width:720px){
          .mem-tiers  { grid-template-columns: 1fr !important; }
          .mem-perks  { grid-template-columns: 1fr 1fr !important; }
          .mem-about  { grid-template-columns: 1fr !important; }
          .mem-about-img { display: none !important; }
        }
        @media(max-width:480px){
          .mem-perks  { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <Link href="/"><Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={1500} height={999} className="nav-logo" /></Link>
        <div className="nav-links">
          {['/', '/#events', '/#contact', '/faq'].map((href, i) => (
            <Link key={i} href={href} style={{ color: '#555', textDecoration: 'none' }}>
              {['Home', 'Events', 'Contact', 'FAQ'][i]}
            </Link>
          ))}
        </div>
        <Link href="/#join" className="nav-join">Join</Link>
        <button className="hamburger btn-push" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
      </nav>
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        {[['/', 'Home'], ['/#events', 'Events'], ['/#contact', 'Contact'], ['/faq', 'FAQ']].map(([href, label]) => (
          <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>{label}</Link>
        ))}
        <Link href="/#join" onClick={() => setMenuOpen(false)} style={{ color: '#1a1a1a', fontWeight: '500' }}>Join</Link>
        <Link href="/members/login" onClick={() => setMenuOpen(false)} style={{ color: '#3B6B2F', fontWeight: '500' }}>Members Login</Link>
      </div>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', overflow: 'hidden' }}>
        {/* Background photo */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <img src="/events/may9-aerial.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,20,13,0.82) 0%, rgba(10,20,13,0.72) 60%, rgba(10,20,13,0.92) 100%)' }} />
        </div>

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.6),transparent)' }} />

        <motion.div initial="hidden" animate="visible" variants={stagger}
          style={{ position: 'relative', zIndex: 1, padding: 'clamp(140px,18vw,200px) 2rem 5rem', maxWidth: '800px' }}>
          <motion.div variants={fadeUp} style={{ ...LABEL, color: 'rgba(197,168,130,0.85)', marginBottom: '1.75rem' }}>
            Canvas Routes · Season 2026
          </motion.div>
          <motion.h1 variants={fadeUp}
            style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(3.8rem,8vw,6.5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1.0, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            For those who chose<br />their car
            <span style={{ fontStyle: 'italic', color: 'rgba(245,241,236,0.65)' }}> on purpose.</span>
          </motion.h1>
          <motion.div variants={fadeUp} style={{ width: '32px', height: '0.5px', background: 'rgba(197,168,130,0.5)', margin: '0 auto 1.5rem' }} />
          <motion.p variants={fadeUp} style={{ ...BODY, color: 'rgba(245,241,236,0.72)', maxWidth: '340px', margin: '0 auto' }}>
            The season runs June to November.<br />Two tiers. One community.
          </motion.p>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.8 }}
          style={{ position: 'absolute', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 1 }}>
          <span style={{ ...LABEL, color: 'rgba(197,168,130,0.35)' }}>Scroll</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}>
            <svg width="12" height="18" viewBox="0 0 12 18" fill="none" stroke="rgba(197,168,130,0.35)" strokeWidth="1.2" strokeLinecap="round">
              <line x1="6" y1="0" x2="6" y2="12"/><polyline points="2 8 6 12 10 8"/>
            </svg>
          </motion.div>
        </motion.div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.15),transparent)' }} />
      </section>

      {/* ── NOTICE BANNER ───────────────────────────────────────────── */}
      <div style={{ background: 'rgba(197,168,130,0.11)', borderBottom: '0.5px solid rgba(197,168,130,0.25)', padding: '1rem 2rem', textAlign: 'center' }}>
        <span style={{ ...SMALL, color: '#7B5B2E' }}>
          <strong>Memberships open June 2026.</strong>
          {' '}Leave your email below for early access before we open to the public.
        </span>
      </div>

      {/* ── ABOUT ───────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(5rem,8vw,8rem) clamp(1.5rem,5vw,5rem)' }}>
        <div className="mem-about" style={{ maxWidth: '1040px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(3rem,6vw,7rem)', alignItems: 'start' }}>

          <FadeUp>
            <div style={{ ...LABEL, color: '#c5a882', marginBottom: '1.5rem' }}>What membership means</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: '1.15', marginBottom: '1.75rem' }}>
              A season of roads<br />you&apos;ll remember.
            </div>
            <p style={{ ...BODY, color: '#444', marginBottom: '1.1rem' }}>
              Canvas Routes membership is built around the drive. Not the parking lot. Not the Instagram photo. The act of getting behind the wheel and going somewhere worth going — with people who feel the same way.
            </p>
            <p style={{ ...BODY, color: '#444' }}>
              From June to November, members get priority access to every Cars &amp; Coffee, every road trip, and every experience we run out of Montreal. Two tiers, both built to give you more of what brought you here.
            </p>
          </FadeUp>

          <FadeUp delay={0.15} style={{ display: 'flex', flexDirection: 'column' }} className="mem-about-img">
            <div style={{ overflow: 'hidden', height: 'clamp(240px,30vw,380px)' }}>
              <img src="/events/may9-lineup.jpeg" alt="Canvas Routes" style={{ width: '100%', height: '117%', objectFit: 'cover', objectPosition: 'center top', display: 'block', marginTop: '-7%' }} />
            </div>
            <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', borderTop: 'none' }}>
              {[['Season', 'June — November'], ['Base', 'Montreal, QC'], ['Events', 'Cars & Coffee · Cruises · Road Trips']].map(([k, v], i, arr) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', padding: '0.9rem 1.25rem', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                  <span style={{ ...LABEL, color: '#c5a882', flexShrink: 0 }}>{k}</span>
                  <span style={{ ...SMALL, color: '#1a1a1a', textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── PHOTO BREAK 1 ───────────────────────────────────────────── */}
      <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}
        style={{ position: 'relative', height: 'clamp(260px,36vw,460px)', overflow: 'hidden' }}>
        <img src="/events/may9-cars-row.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,20,13,0.25), rgba(10,20,13,0.65))' }} />
        <FadeUp style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-cormorant),serif', fontStyle: 'italic', fontSize: 'clamp(1.5rem,3vw,2.2rem)', fontWeight: '300', color: 'rgba(245,241,236,0.88)', lineHeight: '1.5', maxWidth: '520px' }}>
            &ldquo;You chose your car with intention.<br />We choose the routes with intention.<br />Let&apos;s put both towards great drives and lasting memories.&rdquo;
          </div>
        </FadeUp>
      </motion.div>

      {/* ── TIERS ───────────────────────────────────────────────────── */}
      <section style={{ background: '#EDE8E1', padding: 'clamp(5rem,8vw,8rem) clamp(1.5rem,5vw,5rem)' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>

          <FadeUp style={{ textAlign: 'center', marginBottom: 'clamp(3rem,5vw,5rem)' }}>
            <div style={{ ...LABEL, color: '#bbb', marginBottom: '0.75rem' }}>2026 Season</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: '300', color: '#1a1a1a' }}>Choose your tier</div>
          </FadeUp>

          <div className="mem-tiers" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

            {/* TIER 1 */}
            <FadeUp delay={0.05}>
              <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', height: '100%' }}>
                <div style={{ padding: '2.25rem 2.25rem 0' }}>
                  <div style={{ ...LABEL, color: '#999', marginBottom: '0.5rem' }}>Tier 1</div>
                  <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.5rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '2rem', lineHeight: 1.2 }}>
                    Routes<br />Member
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(3.5rem,5.5vw,4.5rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1 }}>$99</span>
                    <span style={{ ...SMALL, color: '#999', paddingBottom: '0.5rem' }}>CAD</span>
                  </div>
                  <div style={{ ...SMALL, color: '#999', marginBottom: '2rem' }}>per season</div>
                  <div style={{ height: '0.5px', background: 'rgba(0,0,0,0.07)', marginBottom: '1.75rem' }} />
                </div>
                <div style={{ padding: '0 2.25rem 2.25rem' }}>
                  <div style={{ ...LABEL, color: '#999', marginBottom: '1.1rem' }}>Includes</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {TIER1.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
                        <CheckIcon />
                        <span style={{ ...BODY, color: '#333' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* TIER 2 */}
            <FadeUp delay={0.15}>
              <div style={{ background: '#0F1E14', position: 'relative', overflow: 'hidden', height: '100%' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(197,168,130,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ padding: '2.25rem 2.25rem 0' }}>
                  <div style={{ ...LABEL, color: 'rgba(197,168,130,0.8)', marginBottom: '0.5rem' }}>Tier 2</div>
                  <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.5rem', fontWeight: '300', color: '#F5F1EC', marginBottom: '2rem', lineHeight: 1.2 }}>
                    Canvas Routes<br />Inner Circle
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(3.5rem,5.5vw,4.5rem)', fontWeight: '300', color: '#c5a882', lineHeight: 1 }}>$249</span>
                    <span style={{ ...SMALL, color: 'rgba(197,168,130,0.75)', paddingBottom: '0.5rem' }}>CAD</span>
                  </div>
                  <div style={{ ...SMALL, color: 'rgba(245,241,236,0.55)', marginBottom: '2rem' }}>per season</div>
                  <div style={{ height: '0.5px', background: 'rgba(197,168,130,0.12)', marginBottom: '1.75rem' }} />
                </div>
                <div style={{ padding: '0 2.25rem 2.25rem' }}>
                  <div style={{ ...LABEL, color: 'rgba(197,168,130,0.8)', marginBottom: '1.1rem' }}>Everything in Tier 1, plus</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {TIER2_EXTRA.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
                        <CheckIcon gold />
                        <span style={{ ...BODY, color: 'rgba(245,241,236,0.82)' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>

          <FadeUp style={{ textAlign: 'center', marginTop: '1.75rem' }}>
            <span style={{ ...SMALL, color: '#888' }}>Season runs June — November. Inner Circle access extends through December.</span>
          </FadeUp>
        </div>
      </section>

      {/* ── PHOTO BREAK 2 ───────────────────────────────────────────── */}
      <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}
        style={{ position: 'relative', height: 'clamp(200px,28vw,360px)', overflow: 'hidden' }}>
        <img src="/events/may9-cars2.jpeg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 72%', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,20,13,0.4)' }} />
      </motion.div>

      {/* ── PHYSICAL PERKS ──────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(5rem,8vw,8rem) clamp(1.5rem,5vw,5rem)', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          <FadeUp style={{ marginBottom: 'clamp(2.5rem,4vw,4rem)' }}>
            <div style={{ ...LABEL, color: '#bbb', marginBottom: '0.75rem' }}>What you receive</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: '300', color: '#1a1a1a' }}>
              Membership you can hold.
            </div>
          </FadeUp>

          <StaggerGrid style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1px', background: 'rgba(0,0,0,0.07)' }} className="mem-perks">
            {PERKS.map((p, i) => (
              <motion.div key={i} variants={fadeUp}
                style={{ background: p.tier === 2 ? '#0F1E14' : '#F5F1EC', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ width: '20px', height: '0.5px', background: p.tier === 2 ? 'rgba(197,168,130,0.5)' : '#c5a882' }} />
                  <span style={{ ...LABEL, color: p.tier === 2 ? 'rgba(197,168,130,0.85)' : '#888', background: p.tier === 2 ? 'rgba(197,168,130,0.08)' : 'rgba(0,0,0,0.05)', border: `0.5px solid ${p.tier === 2 ? 'rgba(197,168,130,0.2)' : 'rgba(0,0,0,0.1)'}`, padding: '2px 8px' }}>
                    {p.tier === 2 ? 'Inner Circle' : 'All members'}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.25rem', fontWeight: '300', color: p.tier === 2 ? '#F5F1EC' : '#1a1a1a', marginBottom: '0.75rem', lineHeight: 1.3 }}>{p.label}</div>
                <div style={{ ...BODY, color: p.tier === 2 ? 'rgba(245,241,236,0.72)' : '#555' }}>{p.sub}</div>
              </motion.div>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ── WAITLIST ────────────────────────────────────────────────── */}
      <section style={{ background: '#0F1E14', padding: 'clamp(5rem,8vw,7rem) clamp(1.5rem,5vw,5rem)', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.45),transparent)' }} />
        <FadeUp style={{ maxWidth: '440px', margin: '0 auto' }}>
          <div style={{ ...LABEL, color: 'rgba(197,168,130,0.85)', marginBottom: '1rem' }}>Founding access</div>
          <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4.5vw,3rem)', fontWeight: '300', color: '#F5F1EC', marginBottom: '0.75rem', lineHeight: 1.1 }}>
            Spots are limited.
          </div>
          <p style={{ ...BODY, color: 'rgba(245,241,236,0.65)', marginBottom: '2.25rem' }}>
            The 2026 season has a fixed number of members. Leave your email and we&apos;ll reach out before we open to the public.
          </p>
          {status === 'success' ? (
            <div style={{ padding: '1.25rem 1.5rem', border: '0.5px solid rgba(197,168,130,0.25)', background: 'rgba(197,168,130,0.06)' }}>
              <span style={{ ...BODY, color: 'rgba(245,241,236,0.82)' }}>You&apos;re on the list. We&apos;ll be in touch before memberships open.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <input ref={honeypotRef} type="text" name="_hp" tabIndex={-1} autoComplete="off"
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0 }} />
              <div style={{ display: 'flex', maxWidth: '420px', margin: '0 auto' }}>
                <input type="email" placeholder="your@email.com" value={email} required
                  onChange={e => { setEmail(e.target.value); if (error) setError(null) }}
                  style={{ flex: 1, padding: '0.9rem 1rem', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(197,168,130,0.2)', borderRight: 'none', color: '#F5F1EC', ...BODY, outline: 'none' }}
                />
                <button type="submit" disabled={status === 'loading'}
                  style={{ padding: '0.9rem 1.5rem', background: '#c5a882', border: 'none', color: '#0F1E14', ...LABEL, letterSpacing: '0.15em', fontWeight: '500', cursor: status === 'loading' ? 'wait' : 'pointer', opacity: status === 'loading' ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                  {status === 'loading' ? 'Sending…' : 'Notify me'}
                </button>
              </div>
              {error && <div style={{ ...SMALL, color: '#d06070', marginTop: '0.75rem' }}>{error}</div>}
            </form>
          )}
        </FadeUp>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.15),transparent)' }} />
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '2rem 3rem', textAlign: 'center', borderTop: '0.5px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <span style={{ ...SMALL, color: '#ccc' }}>© 2026 Canvas Routes. Montreal, QC.</span>
        <a href="https://instagram.com/canvasroutes" target="_blank" rel="noreferrer" style={{ ...LABEL, color: '#c5a882', textDecoration: 'none', borderBottom: '0.5px solid rgba(197,168,130,0.3)', paddingBottom: '1px' }}>@canvasroutes</a>
      </footer>
    </div>
  )
}
