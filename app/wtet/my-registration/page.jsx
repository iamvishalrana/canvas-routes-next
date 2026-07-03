'use client'
import { useState } from 'react'
import SiteNav from '../../../components/SiteNav'
import SiteFooter from '../../../components/SiteFooter'
import WtetWaiverSection from '../../../components/WtetWaiverSection'
import WtetLunchSection from '../../../components/WtetLunchSection'
import { WTET_WAIVER_TEXT } from '../../../lib/wtetRegistrationContent'

const NAV_LINKS = [
  { href: '/',         label: 'Home' },
  { href: '/#events',  label: 'Events' },
  { href: '/#contact', label: 'Contact' },
  { href: '/faq',      label: 'FAQ' },
]

const inp = {
  width: '100%', padding: '0.75rem 0.9rem', border: '1px solid rgba(0,0,0,0.14)',
  background: '#fff', fontSize: '16px', fontFamily: 'var(--font-inter), sans-serif',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const label = { display: 'block', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }

export default function WtetMyRegistrationPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('gate') // gate | loading | found
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  async function lookup(e) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email address.'); return }
    setStatus('loading')
    try {
      const res = await fetch('/api/wtet-registration/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'Something went wrong.'); setStatus('gate'); return }
      setData(d)
      setStatus('found')
    } catch {
      setError('Network error — please try again.')
      setStatus('gate')
    }
  }

  const firstName = data?.name?.trim().split(' ')[0] || ''
  const bothDone = data && !!data.waiver && !!data.lunch

  return (
    <div style={{ minHeight: '100vh', background: '#F5F1EC', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
      <SiteNav links={NAV_LINKS} />
      <main style={{ maxWidth: '620px', margin: '0 auto', padding: '7rem 1.5rem 6rem' }}>

        {(status === 'gate' || status === 'loading') && (
          <>
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>
                Canvas Routes · Whips to Eastern Townships
              </div>
              <h1 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '2.2rem', fontWeight: '300', color: '#0F1E14', margin: '0 0 0.5rem', lineHeight: '1.2' }}>
                View My Registration
              </h1>
              <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '1.25rem 0' }} />
              <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.8', margin: 0 }}>
                Enter the email you registered with to sign your liability waiver and choose your lunch for July 5.
              </p>
              <p style={{ fontSize: '12px', color: '#aaa', lineHeight: '1.7', margin: '0.85rem 0 0' }}>
                Already have the &ldquo;Complete Early Check-in&rdquo; link from your confirmation email? That link works too and takes you straight in — no need to look up your email.
              </p>
            </div>
            <form onSubmit={lookup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '380px' }}>
              <div>
                <label style={label}>Email</label>
                <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inp} />
              </div>
              {error && <div style={{ fontSize: '13px', color: '#7B2032', padding: '0.7rem 0.9rem', background: 'rgba(123,32,50,0.05)', border: '0.5px solid rgba(123,32,50,0.2)' }}>{error}</div>}
              <button type="submit" disabled={status === 'loading'} style={{ alignSelf: 'flex-start', padding: '0.9rem 2rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: status === 'loading' ? 'wait' : 'pointer', opacity: status === 'loading' ? 0.7 : 1 }}>
                {status === 'loading' ? 'Looking up…' : 'Continue'}
              </button>
            </form>
          </>
        )}

        {status === 'found' && data && (
          <>
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>
                Canvas Routes · July 5, 2026
              </div>
              <h1 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '2.2rem', fontWeight: '300', color: '#0F1E14', margin: '0 0 0.5rem', lineHeight: '1.2' }}>
                {firstName ? `Hi ${firstName}` : 'Your Registration'}
              </h1>
              <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '1.25rem 0' }} />
              {bothDone ? (
                <p style={{ fontSize: '14px', color: '#3B6B2F', lineHeight: '1.8', margin: 0 }}>
                  You're all set — waiver signed and lunch selected. See you on July 5.
                </p>
              ) : (
                <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.8', margin: 0 }}>
                  Please complete the item(s) below marked outstanding before the event.
                </p>
              )}
            </div>

            <WtetWaiverSection
              waiverText={WTET_WAIVER_TEXT}
              identifier={{ email: data.email }}
              waiver={data.waiver}
              carYear={data.carYear}
              carMake={data.carMake}
              carModel={data.carModel}
              onSaved={waiver => setData(prev => ({ ...prev, waiver }))}
            />
            <WtetLunchSection
              identifier={{ email: data.email }}
              lunch={data.lunch}
              lunchOptions={data.lunchOptions}
              lunchCutoff={data.lunchCutoff}
              lunchLocked={data.lunchLocked}
              onSaved={lunch => setData(prev => ({ ...prev, lunch }))}
            />

            <button onClick={() => { setStatus('gate'); setData(null); setEmail('') }} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '11px', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              Look up a different email
            </button>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
