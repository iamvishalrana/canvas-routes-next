'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const TIER1 = [
  'Priority access to all Cars & Coffee events',
  'Access to Canvas Routes road trips',
  '10% discount on your next road trip when referring a member',
  '15% discount at one Canvas Routes partner',
  'Canvas Routes branded car perfume every 2 months',
  'Canvas Routes full grain leather keychain',
]

const TIER2_EXTRA = [
  'Exclusive 48hr priority access to all Canvas Routes events before public registration opens',
  '25% referral discount when referring a Tier 2 member',
  'Professional car photoshoot on a Canvas Routes route',
  '$70 one-time discount on one of the next two road trips',
  'Discounts at all Canvas Routes partners',
  'Canvas Routes branded baseball cap',
  'Canvas Routes branded t-shirt',
]

const PERKS = [
  { label: 'Leather Keychain', sub: 'Full grain leather, Canvas Routes branded. Arrives with your welcome kit.' },
  { label: 'Car Perfume', sub: 'Delivered to members every 2 months throughout the season.' },
  { label: 'Cap & Tee', sub: 'Inner Circle members receive a branded cap and t-shirt. Yours to keep.' },
  { label: 'Photoshoot', sub: 'One professional shoot of your car on a Canvas Routes route. Inner Circle only.' },
]

function CheckIcon({ gold }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={gold ? '#c5a882' : '#3B6B2F'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '3px' }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function MembershipContent() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const honeypotRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (status === 'loading') return
    setStatus('loading')
    setError(null)
    try {
      const res = await fetch('/api/membership-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), _hp: honeypotRef.current?.value || '' }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) { setStatus('success') }
      else { setError(data.error || 'Something went wrong. Please try again.'); setStatus('error') }
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div style={{ background: '#F5F1EC', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', minHeight: '100vh' }}>
      <style>{`
        @media(max-width:720px){
          .mem-tiers{ grid-template-columns:1fr !important; }
          .mem-perks{ grid-template-columns:1fr 1fr !important; }
          .mem-about{ grid-template-columns:1fr !important; }
        }
        @media(max-width:480px){
          .mem-perks{ grid-template-columns:1fr !important; }
        }
      `}</style>

      {/* NAV */}
      <nav className="nav">
        <Link href="/">
          <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={1500} height={999} className="nav-logo" />
        </Link>
        <div className="nav-links">
          <Link href="/" style={{ color: '#555', textDecoration: 'none' }}>Home</Link>
          <Link href="/#events" style={{ color: '#555', textDecoration: 'none' }}>Events</Link>
          <Link href="/#contact" style={{ color: '#555', textDecoration: 'none' }}>Contact</Link>
          <Link href="/faq" style={{ color: '#555', textDecoration: 'none' }}>FAQ</Link>
        </div>
        <Link href="/#join" className="nav-join">Join</Link>
        <button className="hamburger btn-push" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
          <span /><span /><span />
        </button>
      </nav>
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <Link href="/" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>Home</Link>
        <Link href="/#events" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>Events</Link>
        <Link href="/#contact" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>Contact</Link>
        <Link href="/faq" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>FAQ</Link>
        <Link href="/#join" onClick={() => setMenuOpen(false)} style={{ color: '#1a1a1a', fontWeight: '500' }}>Join</Link>
        <Link href="/members/login" onClick={() => setMenuOpen(false)} style={{ color: '#3B6B2F', fontWeight: '500' }}>Members Login</Link>
      </div>

      {/* ── HERO ── */}
      <section style={{ background: '#0F1E14', minHeight: '92vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 'clamp(140px,18vw,200px) 2rem 5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.6),transparent)' }} />
        {/* Ambient light */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '300px', background: 'radial-gradient(ellipse, rgba(197,168,130,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ fontSize: '10px', letterSpacing: '0.32em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1.75rem' }}>Canvas Routes · Season 2026</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(3.5rem,9vw,7rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: 1, marginBottom: '1.5rem', letterSpacing: '-0.02em', maxWidth: '700px' }}>
          For those who<br />chose their car<br />
          <span style={{ fontStyle: 'italic', color: 'rgba(245,241,236,0.5)' }}>on purpose.</span>
        </h1>
        <div style={{ width: '36px', height: '0.5px', background: 'rgba(197,168,130,0.45)', margin: '0 auto 1.75rem' }} />
        <p style={{ fontSize: 'clamp(0.85rem,1.6vw,1rem)', color: 'rgba(245,241,236,0.4)', maxWidth: '380px', lineHeight: '1.9', letterSpacing: '0.03em' }}>
          The season runs May to November.<br />Two tiers. One community.
        </p>
        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.35)' }}>Scroll</div>
          <svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="rgba(197,168,130,0.35)" strokeWidth="1.2" strokeLinecap="round"><line x1="6" y1="0" x2="6" y2="14"/><polyline points="2 10 6 14 10 10"/></svg>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.15),transparent)' }} />
      </section>

      {/* ── PHOTO STRIP ── */}
      <div style={{ position: 'relative', height: 'clamp(260px,38vw,480px)', overflow: 'hidden' }}>
        <img src="/events/cc-may9-ferraris.jpeg" alt="Canvas Routes event" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15,30,20,0.3) 0%, rgba(15,30,20,0.55) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontStyle: 'italic', fontSize: 'clamp(1.4rem,3.5vw,2.4rem)', fontWeight: '300', color: 'rgba(245,241,236,0.9)', lineHeight: '1.4', maxWidth: '560px' }}>
              &ldquo;The road is the reward — membership is how you earn it.&rdquo;
            </div>
          </div>
        </div>
      </div>

      {/* ── NOTICE BANNER ── */}
      <div style={{ background: 'rgba(197,168,130,0.13)', borderTop: '0.5px solid rgba(197,168,130,0.25)', borderBottom: '0.5px solid rgba(197,168,130,0.25)', padding: '1rem 2rem', textAlign: 'center' }}>
        <span style={{ fontSize: '12px', color: '#7B5B2E', letterSpacing: '0.04em', lineHeight: '1.6' }}>
          <span style={{ fontWeight: '500' }}>Memberships open after our first road trip — May 31.</span>
          {' '}Priority access coming soon.
        </span>
      </div>

      {/* ── ABOUT SECTION ── */}
      <section style={{ background: '#F5F1EC', padding: 'clamp(4rem,7vw,7rem) clamp(1.5rem,5vw,5rem)' }}>
        <div className="mem-about" style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(3rem,6vw,7rem)', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1.5rem' }}>What membership means</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(1.9rem,3.5vw,2.8rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: '1.15', marginBottom: '1.75rem' }}>
              A season of roads you&apos;ll actually remember.
            </div>
            <p style={{ fontSize: '13.5px', color: '#555', lineHeight: '1.9', marginBottom: '1.25rem' }}>
              Canvas Routes membership is built around the drive. Not the parking lot. Not the Instagram photo. The actual act of getting behind the wheel and going somewhere worth going — with people who feel the same way.
            </p>
            <p style={{ fontSize: '13.5px', color: '#555', lineHeight: '1.9' }}>
              From May to November, members get priority access to every Cars &amp; Coffee, every road trip, and every experience we run out of Montreal. Two tiers, both built to give you more of what brought you here.
            </p>
          </div>
          <div>
            <img src="/events/cc-may9-overview.jpeg" alt="Canvas Routes" style={{ width: '100%', height: 'clamp(260px,35vw,420px)', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: '1px', gap: '1px', background: 'rgba(0,0,0,0.06)' }}>
              {[['Season', 'May — November'],['Base', 'Montreal, QC'],['Events', 'Cars & Coffee + Road trips'],['Access', 'Priority registration']].map(([k, v]) => (
                <div key={k} style={{ background: '#F5F1EC', padding: '0.85rem 1rem' }}>
                  <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.2rem' }}>{k}</div>
                  <div style={{ fontSize: '12px', color: '#444' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TIERS ── */}
      <section style={{ background: '#EDE8E1', padding: 'clamp(4rem,7vw,7rem) clamp(1.5rem,5vw,5rem)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem,5vw,4.5rem)' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.75rem' }}>2026 Season</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: '300', color: '#1a1a1a' }}>Choose your tier</div>
          </div>

          <div className="mem-tiers" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

            {/* TIER 1 — Light */}
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)' }}>
              <div style={{ padding: '2.25rem 2.25rem 0' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.26em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.6rem' }}>Tier 1</div>
                <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.5rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '2rem', lineHeight: 1.2 }}>
                  Canvas Routes<br />Member
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(3.5rem,6vw,5rem)', fontWeight: '300', color: '#1a1a1a', lineHeight: 1 }}>$99</span>
                  <span style={{ fontSize: '11px', color: '#bbb', letterSpacing: '0.08em', paddingBottom: '0.6rem' }}>CAD</span>
                </div>
                <div style={{ fontSize: '10px', letterSpacing: '0.1em', color: '#aaa', marginBottom: '2rem' }}>per season</div>
                <div style={{ height: '0.5px', background: 'rgba(0,0,0,0.07)', marginBottom: '1.75rem' }} />
              </div>
              <div style={{ padding: '0 2.25rem 2.25rem' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#bbb', marginBottom: '1.1rem' }}>Includes</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {TIER1.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
                      <CheckIcon />
                      <span style={{ fontSize: '12.5px', color: '#444', lineHeight: '1.6' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* TIER 2 — Dark */}
            <div style={{ background: '#0F1E14', position: 'relative', overflow: 'hidden' }}>
              {/* Glow */}
              <div style={{ position: 'absolute', top: 0, right: 0, width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(197,168,130,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />
              {/* Best Value tag */}
              <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#c5a882', padding: '3px 11px' }}>
                <span style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0F1E14', fontWeight: '500' }}>Best Value</span>
              </div>
              <div style={{ padding: '2.25rem 2.25rem 0' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.5)', marginBottom: '0.6rem' }}>Tier 2</div>
                <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.5rem', fontWeight: '300', color: '#F5F1EC', marginBottom: '2rem', lineHeight: 1.2 }}>
                  Canvas Routes<br />Inner Circle
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(3.5rem,6vw,5rem)', fontWeight: '300', color: '#c5a882', lineHeight: 1 }}>$249</span>
                  <span style={{ fontSize: '11px', color: 'rgba(197,168,130,0.5)', letterSpacing: '0.08em', paddingBottom: '0.6rem' }}>CAD</span>
                </div>
                <div style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'rgba(245,241,236,0.3)', marginBottom: '2rem' }}>per season</div>
                <div style={{ height: '0.5px', background: 'rgba(197,168,130,0.15)', marginBottom: '1.75rem' }} />
              </div>
              <div style={{ padding: '0 2.25rem 2.25rem' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.45)', marginBottom: '1.1rem' }}>Everything in Tier 1, plus</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {TIER2_EXTRA.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
                      <CheckIcon gold />
                      <span style={{ fontSize: '12.5px', color: 'rgba(245,241,236,0.65)', lineHeight: '1.6' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: '11px', color: '#bbb', marginTop: '1.75rem', letterSpacing: '0.04em' }}>
            Season runs May to November.
          </p>
        </div>
      </section>

      {/* ── PHYSICAL PERKS ── */}
      <section style={{ background: '#F5F1EC', padding: 'clamp(4rem,7vw,7rem) clamp(1.5rem,5vw,5rem)', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ marginBottom: 'clamp(2.5rem,4vw,4rem)' }}>
            <div style={{ fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.75rem' }}>What you receive</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', fontWeight: '300', color: '#1a1a1a' }}>
              Membership you can hold.
            </div>
          </div>
          <div className="mem-perks" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'rgba(0,0,0,0.07)' }}>
            {PERKS.map((p, i) => (
              <div key={i} style={{ background: '#F5F1EC', padding: '2rem 1.5rem' }}>
                <div style={{ width: '28px', height: '0.5px', background: '#c5a882', marginBottom: '1.5rem' }} />
                <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.15rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.75rem', lineHeight: 1.3 }}>{p.label}</div>
                <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.7' }}>{p.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WAITLIST ── */}
      <section style={{ background: '#0F1E14', padding: 'clamp(4rem,7vw,6.5rem) clamp(1.5rem,5vw,5rem)', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.45),transparent)' }} />
        <div style={{ maxWidth: '460px', margin: '0 auto' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.55)', marginBottom: '1rem' }}>Get notified</div>
          <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2rem,4.5vw,3rem)', fontWeight: '300', color: '#F5F1EC', marginBottom: '0.75rem', lineHeight: 1.1 }}>
            Be first to know.
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(245,241,236,0.4)', marginBottom: '2.25rem', lineHeight: '1.8', letterSpacing: '0.02em' }}>
            Leave your email and we&apos;ll reach out the moment memberships open.
          </p>
          {status === 'success' ? (
            <div style={{ padding: '1.25rem 1.5rem', border: '0.5px solid rgba(197,168,130,0.25)', background: 'rgba(197,168,130,0.06)' }}>
              <div style={{ fontSize: '13px', color: 'rgba(245,241,236,0.65)', lineHeight: '1.7' }}>
                You&apos;re on the list. We&apos;ll be in touch before memberships open.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <input ref={honeypotRef} type="text" name="_hp" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0 }} />
              <div style={{ display: 'flex', maxWidth: '420px', margin: '0 auto' }}>
                <input
                  type="email" placeholder="your@email.com" value={email} required
                  onChange={e => { setEmail(e.target.value); if (error) setError(null) }}
                  style={{ flex: 1, padding: '0.9rem 1rem', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(197,168,130,0.2)', borderRight: 'none', color: '#F5F1EC', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', outline: 'none', letterSpacing: '0.02em' }}
                />
                <button type="submit" disabled={status === 'loading'}
                  style={{ padding: '0.9rem 1.5rem', background: '#c5a882', border: 'none', color: '#0F1E14', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'var(--font-inter),sans-serif', cursor: status === 'loading' ? 'wait' : 'pointer', opacity: status === 'loading' ? 0.6 : 1, whiteSpace: 'nowrap', fontWeight: '500' }}>
                  {status === 'loading' ? 'Sending…' : 'Notify me'}
                </button>
              </div>
              {error && <div style={{ marginTop: '0.75rem', fontSize: '12px', color: '#d06070' }}>{error}</div>}
            </form>
          )}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.15),transparent)' }} />
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '2rem 3rem', textAlign: 'center', borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
        <p style={{ fontSize: '11px', color: '#ccc', letterSpacing: '0.05em' }}>© 2026 Canvas Routes. Montreal, QC.</p>
      </footer>
    </div>
  )
}
