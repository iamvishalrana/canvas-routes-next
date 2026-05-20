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

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3B6B2F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '3px' }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function GoldDot() {
  return <div style={{ width: '4px', height: '4px', background: '#c5a882', flexShrink: 0, marginTop: '7px' }} />
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
      if (res.ok) {
        setStatus('success')
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div style={{ background: '#F5F1EC', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', minHeight: '100vh' }}>

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

      {/* MOBILE MENU */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <Link href="/" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>Home</Link>
        <Link href="/#events" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>Events</Link>
        <Link href="/#contact" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>Contact</Link>
        <Link href="/faq" onClick={() => setMenuOpen(false)} style={{ color: '#555', textDecoration: 'none' }}>FAQ</Link>
        <Link href="/#join" onClick={() => setMenuOpen(false)} style={{ color: '#1a1a1a', fontWeight: '500' }}>Join</Link>
        <Link href="/members/login" onClick={() => setMenuOpen(false)} style={{ color: '#3B6B2F', fontWeight: '500' }}>Members Login</Link>
      </div>

      {/* HERO */}
      <section style={{ background: '#0F1E14', padding: 'clamp(130px,17vw,200px) 3rem 5.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.6),transparent)' }} />
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.6)', marginBottom: '1.2rem' }}>Canvas Routes · Season 2026</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(2.8rem,6.5vw,5rem)', fontWeight: '300', color: '#F5F1EC', lineHeight: '1.05', marginBottom: '1.25rem', letterSpacing: '-0.01em' }}>
          Canvas Routes<br />Membership
        </h1>
        <div style={{ width: '36px', height: '0.5px', background: 'rgba(197,168,130,0.5)', margin: '0 auto 1.75rem' }} />
        <p style={{ fontSize: 'clamp(0.9rem,1.8vw,1.1rem)', fontFamily: 'var(--font-cormorant),serif', fontStyle: 'italic', color: 'rgba(245,241,236,0.55)', maxWidth: '420px', margin: '0 auto', lineHeight: '1.75' }}>
          The season runs May to November.<br />Two tiers. One community.
        </p>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.2),transparent)' }} />
      </section>

      {/* NOTICE BANNER */}
      <div style={{ background: 'rgba(197,168,130,0.12)', borderBottom: '0.5px solid rgba(197,168,130,0.3)', padding: '1rem 2rem', textAlign: 'center' }}>
        <span style={{ fontSize: '12px', color: '#7B5B2E', letterSpacing: '0.04em', lineHeight: '1.6' }}>
          <span style={{ fontWeight: '500' }}>Memberships open after our first road trip — May 31.</span>
          {' '}Road trip participants receive exclusive early access pricing.
        </span>
      </div>

      {/* PRICING CARDS */}
      <section style={{ padding: 'clamp(3.5rem,6vw,6rem) clamp(1.25rem,4vw,3rem)' }}>
        <style>{`
          @media(max-width:720px){ .membership-grid{ grid-template-columns:1fr !important; } }
        `}</style>
        <div style={{ maxWidth: '940px', margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem,4vw,4rem)' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#aaa', marginBottom: '0.75rem' }}>2026 Season</div>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', fontWeight: '300', color: '#1a1a1a' }}>Choose your tier</div>
          </div>

          <div className="membership-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

            {/* TIER 1 */}
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '2rem 2rem 1.5rem' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#aaa', marginBottom: '1rem' }}>Tier 1</div>
                <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.6rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '1.5rem', lineHeight: 1.15 }}>
                  Canvas Routes<br />Member
                </div>
                <div style={{ paddingBottom: '1.5rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.8rem', fontWeight: '300', color: '#1a1a1a', lineHeight: 1 }}>$99</span>
                    <span style={{ fontSize: '11px', color: '#aaa', letterSpacing: '0.06em' }}>CAD / season</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ height: '0.5px', flex: 1, background: 'rgba(197,168,130,0.3)' }} />
                    <span style={{ fontSize: '10px', color: '#c5a882', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Road trip price</span>
                    <div style={{ height: '0.5px', flex: 1, background: 'rgba(197,168,130,0.3)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.5rem' }}>
                    <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.9rem', fontWeight: '300', color: '#c5a882', lineHeight: 1 }}>$49</span>
                    <span style={{ fontSize: '11px', color: '#aaa', letterSpacing: '0.06em' }}>CAD / season</span>
                  </div>
                </div>
                <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bbb', marginBottom: '1rem' }}>What&apos;s included</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {TIER1.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                      <CheckIcon />
                      <span style={{ fontSize: '12.5px', color: '#444', lineHeight: '1.6' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* TIER 2 */}
            <div style={{ background: '#fff', border: '0.5px solid rgba(197,168,130,0.4)', borderTop: '3px solid #c5a882', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {/* Best Value badge */}
              <div style={{ position: 'absolute', top: '-1px', right: '1.5rem', background: '#c5a882', padding: '3px 10px' }}>
                <span style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#fff', fontFamily: 'var(--font-inter),sans-serif' }}>Best Value</span>
              </div>
              <div style={{ padding: '2rem 2rem 1.5rem' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>Tier 2</div>
                <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.6rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '1.5rem', lineHeight: 1.15 }}>
                  Canvas Routes<br />Inner Circle
                </div>
                <div style={{ paddingBottom: '1.5rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.8rem', fontWeight: '300', color: '#1a1a1a', lineHeight: 1 }}>$249</span>
                    <span style={{ fontSize: '11px', color: '#aaa', letterSpacing: '0.06em' }}>CAD / season</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ height: '0.5px', flex: 1, background: 'rgba(197,168,130,0.3)' }} />
                    <span style={{ fontSize: '10px', color: '#c5a882', letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Road trip price</span>
                    <div style={{ height: '0.5px', flex: 1, background: 'rgba(197,168,130,0.3)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.5rem' }}>
                    <span style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.9rem', fontWeight: '300', color: '#c5a882', lineHeight: 1 }}>$199</span>
                    <span style={{ fontSize: '11px', color: '#aaa', letterSpacing: '0.06em' }}>CAD / season</span>
                  </div>
                </div>
                <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bbb', marginBottom: '1rem' }}>Everything in Tier 1, plus</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {TIER2_EXTRA.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                      <GoldDot />
                      <span style={{ fontSize: '12.5px', color: '#444', lineHeight: '1.6' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Note below cards */}
          <p style={{ textAlign: 'center', fontSize: '11.5px', color: '#aaa', marginTop: '1.75rem', lineHeight: '1.7', letterSpacing: '0.02em' }}>
            Road trip participants receive exclusive early access pricing. Season runs May to November.
          </p>
        </div>
      </section>

      {/* WAITLIST */}
      <section style={{ background: '#0F1E14', padding: 'clamp(3.5rem,6vw,5.5rem) clamp(1.25rem,4vw,3rem)', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.4),transparent)' }} />
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.6)', marginBottom: '1rem' }}>Get notified</div>
          <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(1.9rem,4vw,2.8rem)', fontWeight: '300', color: '#F5F1EC', marginBottom: '0.75rem', lineHeight: 1.1 }}>
            Be first to know.
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(245,241,236,0.45)', marginBottom: '2.25rem', lineHeight: '1.75', letterSpacing: '0.02em' }}>
            Leave your email and we&apos;ll reach out the moment memberships open.
          </p>

          {status === 'success' ? (
            <div style={{ padding: '1.25rem 1.5rem', border: '0.5px solid rgba(197,168,130,0.3)', background: 'rgba(197,168,130,0.07)' }}>
              <div style={{ fontSize: '13px', color: 'rgba(245,241,236,0.7)', lineHeight: '1.7' }}>
                You&apos;re on the list. We&apos;ll be in touch before memberships open.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Honeypot */}
              <input ref={honeypotRef} type="text" name="_hp" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0 }} />
              <div style={{ display: 'flex', gap: '0', maxWidth: '420px', margin: '0 auto' }}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (error) setError(null) }}
                  required
                  style={{
                    flex: 1, padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.06)',
                    border: '0.5px solid rgba(197,168,130,0.25)', borderRight: 'none',
                    color: '#F5F1EC', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif',
                    outline: 'none', letterSpacing: '0.02em',
                  }}
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  style={{
                    padding: '0.85rem 1.4rem', background: '#c5a882', border: 'none',
                    color: '#0F1E14', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase',
                    fontFamily: 'var(--font-inter),sans-serif', cursor: status === 'loading' ? 'wait' : 'pointer',
                    opacity: status === 'loading' ? 0.6 : 1, whiteSpace: 'nowrap', fontWeight: '500',
                  }}
                >
                  {status === 'loading' ? 'Sending…' : 'Notify me'}
                </button>
              </div>
              {error && (
                <div style={{ marginTop: '0.75rem', fontSize: '12px', color: '#d06070' }}>{error}</div>
              )}
            </form>
          )}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(197,168,130,0.2),transparent)' }} />
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '2rem 3rem', textAlign: 'center', borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: '11px', color: '#ccc', letterSpacing: '0.05em' }}>© 2026 Canvas Routes. Montreal, QC.</p>
      </footer>

    </div>
  )
}
