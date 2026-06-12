'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function RsvpPage() {
  const { token } = useParams()
  const [state, setState] = useState('loading') // loading | ready | confirmed | already | expired | error
  const [eventName, setEventName] = useState('')
  const [applicantName, setApplicantName] = useState('')
  const [dietary, setDietary] = useState('')
  const [passengers, setPassengers] = useState('0')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/rsvp/${token}`)
      .then(r => r.json().then(d => ({ ok: r.ok, status: r.status, ...d })))
      .then(d => {
        if (d.expired) { setState('expired'); return }
        if (!d.ok) { setState('error'); setErr(d.error || 'Invalid link.'); return }
        setEventName(d.eventName || '')
        setApplicantName(d.applicantName || '')
        if (d.alreadyConfirmed) { setState('already'); return }
        setState('ready')
      })
      .catch(() => { setState('error'); setErr('Could not load this invitation.') })
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true); setErr(null)
    try {
      const res = await fetch(`/api/rsvp/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dietary, passengers: parseInt(passengers) || 0 }),
      })
      const d = await res.json()
      if (d.alreadyConfirmed) { setState('already'); return }
      if (!res.ok) { setErr(d.error || 'Something went wrong.'); return }
      setEventName(d.eventName || eventName)
      setState('confirmed')
    } catch {
      setErr('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const firstName = applicantName.split(' ')[0] || ''

  return (
    <div style={{ minHeight: '100vh', background: '#0F1E14', fontFamily: 'var(--font-inter),sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <div style={{ padding: '1.5rem 2rem' }}>
        <Link href="/">
          <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={140} height={93} style={{ width: '100px', height: 'auto', opacity: 0.85 }} />
        </Link>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>

          {/* Gold divider */}
          <div style={{ width: '28px', height: '1px', background: '#c5a882', marginBottom: '1.5rem' }} />

          {state === 'loading' && (
            <p style={{ color: 'rgba(245,241,236,0.4)', fontSize: '13px' }}>Loading your invitation…</p>
          )}

          {state === 'error' && (
            <>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>Canvas Routes</div>
              <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.2rem', fontWeight: '300', color: '#F5F1EC', marginBottom: '1rem', lineHeight: 1.2 }}>Link not found.</h1>
              <p style={{ color: 'rgba(245,241,236,0.55)', fontSize: '14px', lineHeight: '1.8', marginBottom: '1.5rem' }}>{err}</p>
              <p style={{ color: 'rgba(245,241,236,0.4)', fontSize: '13px', lineHeight: '1.8' }}>
                If you think this is a mistake, reply to your invite email or reach out at{' '}
                <a href="mailto:jerry@canvasroutes.com" style={{ color: '#c5a882', textDecoration: 'none' }}>jerry@canvasroutes.com</a>.
              </p>
            </>
          )}

          {state === 'expired' && (
            <>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>Canvas Routes</div>
              <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.2rem', fontWeight: '300', color: '#F5F1EC', marginBottom: '1rem', lineHeight: 1.2 }}>This link has expired.</h1>
              <p style={{ color: 'rgba(245,241,236,0.55)', fontSize: '14px', lineHeight: '1.8', marginBottom: '1.5rem' }}>
                Your invitation link is no longer active. Reply to your invite email or reach out directly and we&apos;ll get it sorted.
              </p>
              <a href="mailto:jerry@canvasroutes.com" style={{ display: 'inline-block', padding: '0.85rem 2rem', border: '1px solid rgba(197,168,130,0.4)', color: '#c5a882', textDecoration: 'none', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'var(--font-inter),sans-serif' }}>
                Email Jerry →
              </a>
            </>
          )}

          {state === 'already' && (
            <>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>Canvas Routes</div>
              <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.2rem', fontWeight: '300', color: '#F5F1EC', marginBottom: '1rem', lineHeight: 1.2 }}>You&apos;re already in.</h1>
              <p style={{ color: 'rgba(245,241,236,0.6)', fontSize: '14px', lineHeight: '1.8', marginBottom: '1.5rem' }}>
                You&apos;ve already confirmed your spot{eventName ? ` for ${eventName}` : ''}. We&apos;ll be in touch with event details closer to the date.
              </p>
              <a href="https://www.instagram.com/canvasroutes" style={{ display: 'inline-block', padding: '0.85rem 2rem', border: '1px solid rgba(197,168,130,0.4)', color: '#c5a882', textDecoration: 'none', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'var(--font-inter),sans-serif' }}>
                Follow @canvasroutes →
              </a>
            </>
          )}

          {state === 'confirmed' && (
            <>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>Canvas Routes</div>
              <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.5rem', fontWeight: '300', color: '#F5F1EC', marginBottom: '1rem', lineHeight: 1.2 }}>
                {firstName ? `See you there, ${firstName}.` : 'You\'re confirmed.'}
              </h1>
              <p style={{ color: 'rgba(245,241,236,0.6)', fontSize: '15px', lineHeight: '1.85', marginBottom: '1rem' }}>
                Your spot for <strong style={{ color: '#F5F1EC', fontWeight: '400' }}>{eventName}</strong> is confirmed.
              </p>
              <p style={{ color: 'rgba(245,241,236,0.45)', fontSize: '13px', lineHeight: '1.8', marginBottom: '2rem' }}>
                You&apos;ll receive full event details — meeting point, timing, and everything you need — closer to the date. Keep an eye on your inbox and check spam just in case.
              </p>
              <a href="https://www.instagram.com/canvasroutes" style={{ display: 'inline-block', padding: '0.85rem 2rem', border: '1px solid rgba(197,168,130,0.4)', color: '#c5a882', textDecoration: 'none', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'var(--font-inter),sans-serif' }}>
                Follow @canvasroutes →
              </a>
            </>
          )}

          {state === 'ready' && (
            <>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>Canvas Routes · You&apos;re Invited</div>
              <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.2rem', fontWeight: '300', color: '#F5F1EC', marginBottom: '0.75rem', lineHeight: 1.2 }}>
                {firstName ? `Confirm your spot, ${firstName}.` : 'Confirm your spot.'}
              </h1>
              <p style={{ color: 'rgba(245,241,236,0.6)', fontSize: '14px', lineHeight: '1.8', marginBottom: '2rem' }}>
                You&apos;ve been invited to <strong style={{ color: '#F5F1EC', fontWeight: '400' }}>{eventName}</strong>. Answer two quick questions and you&apos;re in.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label htmlFor="rsvp-dietary" style={{ display: 'block', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', marginBottom: '0.5rem', fontFamily: 'var(--font-inter),sans-serif' }}>
                    Any dietary restrictions or allergies for the lunch stop?
                    <span style={{ color: 'rgba(245,241,236,0.3)', marginLeft: '0.4rem', textTransform: 'none', letterSpacing: 0, fontSize: '10px' }}>optional</span>
                  </label>
                  <input
                    id="rsvp-dietary"
                    type="text"
                    value={dietary}
                    onChange={e => setDietary(e.target.value)}
                    placeholder="None / Vegetarian / No shellfish…"
                    maxLength={200}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem', background: 'rgba(245,241,236,0.06)', border: '0.5px solid rgba(197,168,130,0.25)', color: '#F5F1EC', fontSize: '14px', fontFamily: 'var(--font-inter),sans-serif', outline: 'none' }}
                  />
                </div>

                <div>
                  <label htmlFor="rsvp-passengers" style={{ display: 'block', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)', marginBottom: '0.5rem', fontFamily: 'var(--font-inter),sans-serif' }}>
                    How many passengers will you be bringing?
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      id="rsvp-passengers"
                      value={passengers}
                      onChange={e => setPassengers(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem 2rem 0.75rem 1rem', background: 'rgba(245,241,236,0.06)', border: '0.5px solid rgba(197,168,130,0.25)', color: '#F5F1EC', fontSize: '14px', fontFamily: 'var(--font-inter),sans-serif', outline: 'none', cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' }}
                    >
                      <option value="0" style={{ background: '#0F1E14' }}>Just me</option>
                      <option value="1" style={{ background: '#0F1E14' }}>1 passenger</option>
                      <option value="2" style={{ background: '#0F1E14' }}>2 passengers</option>
                      <option value="3" style={{ background: '#0F1E14' }}>3+ passengers</option>
                    </select>
                    <svg style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(197,168,130,0.6)" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>

                {err && <p style={{ fontSize: '12px', color: '#d06070', margin: 0 }}>{err}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '1rem', background: submitting ? 'rgba(197,168,130,0.6)' : '#c5a882', border: 'none', color: '#0F1E14', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: '600', cursor: submitting ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', marginTop: '0.5rem', transition: 'background 0.2s' }}
                >
                  {submitting ? 'Confirming…' : 'Confirm My Spot'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '1.5rem 2rem', borderTop: '0.5px solid rgba(197,168,130,0.1)', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: 'rgba(245,241,236,0.25)', margin: 0 }}>© 2026 Canvas Routes. Montreal, QC.</p>
      </div>
    </div>
  )
}
