'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const INP = {
  width: '100%', boxSizing: 'border-box', padding: '0.75rem 1rem',
  background: '#fff', border: '0.5px solid rgba(0,0,0,0.18)',
  color: '#1a1a1a', fontSize: '16px', fontFamily: 'var(--font-inter),sans-serif',
  outline: 'none', borderRadius: 0, appearance: 'none', WebkitAppearance: 'none',
  transition: 'border-color 0.15s',
}
const LABEL = {
  display: 'block', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase',
  color: '#888', marginBottom: '0.5rem', fontFamily: 'var(--font-inter),sans-serif',
}

function ToggleBtn({ selected, onClick, children, fullWidth }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: fullWidth ? undefined : 1,
        width: fullWidth ? '100%' : undefined,
        padding: '0.75rem 1rem', textAlign: 'left',
        background: selected ? '#0F1E14' : '#fff',
        border: `0.5px solid ${selected ? '#0F1E14' : 'rgba(0,0,0,0.15)'}`,
        color: selected ? '#F5F1EC' : '#555',
        fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif',
        cursor: 'pointer', transition: 'all 0.15s', borderRadius: 0,
      }}
    >
      {children}
    </button>
  )
}

export default function RsvpPage() {
  const { token } = useParams()
  const [state, setState]         = useState('loading')
  const [eventName, setEventName]         = useState('')
  const [eventType, setEventType]         = useState(null)
  const [applicantName, setApplicantName] = useState('')
  const [dietary, setDietary]     = useState('')
  const [passengers, setPassengers] = useState('1')
  const [whatsapp, setWhatsapp]   = useState(null)
  const [bringingGuest, setBringingGuest] = useState(null)
  const [carMods, setCarMods]     = useState('')
  const [carPaint, setCarPaint]   = useState('')
  const [arrival, setArrival]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)

  const isRoadTrip = eventType === 'Road Trip'

  useEffect(() => {
    if (!token) return
    fetch(`/api/rsvp/${token}`)
      .then(r => r.json().then(d => ({ ok: r.ok, status: r.status, ...d })))
      .then(d => {
        if (d.expired)  { setState('expired'); return }
        if (!d.ok)      { setState('error'); setErr(d.error || 'Invalid link.'); return }
        setEventName(d.eventName || '')
        setEventType(d.eventType || null)
        setApplicantName(d.applicantName || '')
        if (d.alreadyConfirmed) { setState('already'); return }
        setState('ready')
      })
      .catch(() => { setState('error'); setErr('Could not load this invitation.') })
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true); setErr(null)
    const body = isRoadTrip
      ? { dietary, passengers: parseInt(passengers) || 1, whatsapp }
      : { bringing_guest: bringingGuest, car_mods: carMods.trim() || null, car_paint: carPaint.trim() || null, arrival: arrival || null }
    try {
      const res = await fetch(`/api/rsvp/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
  const isDisabled = submitting || (!isRoadTrip && bringingGuest === null) || (isRoadTrip && whatsapp === null)

  return (
    <div style={{ minHeight: '100vh', background: '#F5F1EC', fontFamily: 'var(--font-inter),sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <div style={{ background: '#0F1E14', padding: '1rem 2rem' }}>
        <Link href="/">
          <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={140} height={93} style={{ width: '90px', height: 'auto', opacity: 0.9 }} />
        </Link>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '3rem 1rem 4rem' }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>

          {state === 'loading' && (
            <p style={{ color: '#aaa', fontSize: '13px' }}>Loading your invitation…</p>
          )}

          {state === 'error' && (
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', padding: '2.5rem' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>Canvas Routes</div>
              <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '1rem', lineHeight: 1.2 }}>Link not found.</h1>
              <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.8', marginBottom: '1.5rem' }}>{err}</p>
              <p style={{ color: '#999', fontSize: '13px', lineHeight: '1.8' }}>
                If you think this is a mistake, reply to your invite email or reach out at{' '}
                <a href="mailto:jerry@canvasroutes.com" style={{ color: '#3B6B2F', textDecoration: 'none' }}>jerry@canvasroutes.com</a>.
              </p>
            </div>
          )}

          {state === 'expired' && (
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', padding: '2.5rem' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>Canvas Routes</div>
              <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '1rem', lineHeight: 1.2 }}>This link has expired.</h1>
              <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.8', marginBottom: '1.75rem' }}>
                Your invitation link is no longer active. Reply to your invite email or reach out and we&apos;ll get it sorted.
              </p>
              <a href="mailto:jerry@canvasroutes.com" style={{ display: 'inline-block', padding: '0.85rem 2rem', background: '#0F1E14', color: '#F5F1EC', textDecoration: 'none', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'var(--font-inter),sans-serif' }}>
                Email Jerry →
              </a>
            </div>
          )}

          {state === 'already' && (
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', padding: '2.5rem' }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>Canvas Routes</div>
              <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.2rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '1rem', lineHeight: 1.2 }}>You&apos;re already in.</h1>
              <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.8', marginBottom: '1.75rem' }}>
                You&apos;ve already confirmed your spot{eventName ? ` for ${eventName}` : ''}. We&apos;ll be in touch with details closer to the date.
              </p>
              <a href="https://www.instagram.com/canvasroutes" style={{ display: 'inline-block', padding: '0.85rem 2rem', border: '0.5px solid rgba(0,0,0,0.2)', color: '#555', textDecoration: 'none', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'var(--font-inter),sans-serif' }}>
                Follow @canvasroutes →
              </a>
            </div>
          )}

          {state === 'confirmed' && (
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', padding: '2.5rem' }}>
              <div style={{ width: '28px', height: '2px', background: '#c5a882', marginBottom: '1.5rem' }} />
              <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>Canvas Routes</div>
              <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.4rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '1rem', lineHeight: 1.2 }}>
                {firstName ? `See you there, ${firstName}.` : "You're confirmed."}
              </h1>
              <p style={{ color: '#444', fontSize: '15px', lineHeight: '1.85', marginBottom: '0.75rem' }}>
                Your spot for <strong style={{ color: '#1a1a1a', fontWeight: '500' }}>{eventName}</strong> is confirmed.
              </p>
              <p style={{ color: '#888', fontSize: '13px', lineHeight: '1.8', marginBottom: '2rem' }}>
                {isRoadTrip
                  ? "You'll receive the full itinerary — meeting point, timing, and everything you need — closer to the date. Keep an eye on your inbox."
                  : "A confirmation has been sent to your email. We'll be in touch before the event."}
              </p>
              <a href="https://www.instagram.com/canvasroutes" style={{ display: 'inline-block', padding: '0.85rem 2rem', border: '0.5px solid rgba(0,0,0,0.2)', color: '#555', textDecoration: 'none', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'var(--font-inter),sans-serif' }}>
                Follow @canvasroutes →
              </a>

              <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.75rem' }}>Canvas Routes Membership</div>
                <h2 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.6rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.75rem', lineHeight: 1.25 }}>
                  Make this a regular thing.
                </h2>
                <p style={{ color: '#888', fontSize: '13px', lineHeight: '1.85', marginBottom: '1.5rem' }}>
                  Canvas Routes membership gives you early access to events, exclusive road trips, and a community of people who take their cars seriously.
                </p>
                <a href="/membership" style={{ display: 'inline-block', padding: '0.85rem 2rem', background: '#0F1E14', color: '#F5F1EC', textDecoration: 'none', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: '600', fontFamily: 'var(--font-inter),sans-serif' }}>
                  Apply for Membership →
                </a>
              </div>
            </div>
          )}

          {state === 'ready' && (
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', padding: '2.5rem' }}>
              <div style={{ width: '28px', height: '2px', background: '#c5a882', marginBottom: '1.5rem' }} />
              <div style={{ fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.85rem' }}>
                Canvas Routes &middot; {isRoadTrip ? 'Road Trip' : 'Car Meet'} &middot; You&apos;re Invited
              </div>
              <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.1rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.6rem', lineHeight: 1.2 }}>
                {firstName ? `Confirm your spot, ${firstName}.` : 'Confirm your spot.'}
              </h1>
              <p style={{ color: '#555', fontSize: '14px', lineHeight: '1.8', marginBottom: '2rem' }}>
                You&apos;ve been invited to <strong style={{ color: '#1a1a1a', fontWeight: '500' }}>{eventName}</strong>.{' '}
                {isRoadTrip
                  ? 'Answer two quick questions and your spot is locked in.'
                  : "A few quick questions and you're in."}
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {isRoadTrip ? <>
                  <div>
                    <label htmlFor="rsvp-dietary" style={LABEL}>
                      Any dietary restrictions or allergies?{' '}
                      <span style={{ color: '#bbb', textTransform: 'none', letterSpacing: 0, fontSize: '10px' }}>optional</span>
                    </label>
                    <input
                      id="rsvp-dietary"
                      type="text"
                      value={dietary}
                      onChange={e => setDietary(e.target.value)}
                      placeholder="None / Vegetarian / No shellfish…"
                      maxLength={200}
                      style={INP}
                    />
                  </div>
                  <div>
                    <label htmlFor="rsvp-passengers" style={LABEL}>
                      How many people in your car? (including yourself)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <select
                        id="rsvp-passengers"
                        value={passengers}
                        onChange={e => setPassengers(e.target.value)}
                        style={{ ...INP, cursor: 'pointer', paddingRight: '2rem' }}
                      >
                        <option value="1">1 — just me</option>
                        <option value="2">2 people</option>
                        <option value="3">3 people</option>
                        <option value="4">4+ people</option>
                      </select>
                      <svg style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                  <div>
                    <div style={LABEL}>Can we add you to a WhatsApp group with all participants?</div>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <ToggleBtn selected={whatsapp === true}  onClick={() => setWhatsapp(true)}>Yes, add me</ToggleBtn>
                      <ToggleBtn selected={whatsapp === false} onClick={() => setWhatsapp(false)}>No thanks</ToggleBtn>
                    </div>
                    <p style={{ fontSize: '11px', color: '#bbb', margin: '0.5rem 0 0' }}>
                      We&apos;ll use the phone number from your application.
                    </p>
                  </div>
                </> : <>
                  <div>
                    <div style={LABEL}>Will you be bringing a guest?</div>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <ToggleBtn selected={bringingGuest === false} onClick={() => setBringingGuest(false)}>No, just me</ToggleBtn>
                      <ToggleBtn selected={bringingGuest === true}  onClick={() => setBringingGuest(true)}>Yes, bringing a guest</ToggleBtn>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="rsvp-paint" style={LABEL}>
                      What colour is your car?{' '}
                      <span style={{ color: '#bbb', textTransform: 'none', letterSpacing: 0, fontSize: '10px' }}>optional</span>
                    </label>
                    <input
                      id="rsvp-paint"
                      type="text"
                      value={carPaint}
                      onChange={e => setCarPaint(e.target.value)}
                      placeholder="Midnight blue, Porsche GT Silver, wrapped matte black…"
                      maxLength={100}
                      style={INP}
                    />
                  </div>

                  <div>
                    <label htmlFor="rsvp-mods" style={LABEL}>
                      Any recent mods you&apos;d like to highlight?{' '}
                      <span style={{ color: '#bbb', textTransform: 'none', letterSpacing: 0, fontSize: '10px' }}>optional</span>
                    </label>
                    <input
                      id="rsvp-mods"
                      type="text"
                      value={carMods}
                      onChange={e => setCarMods(e.target.value)}
                      placeholder="Exhaust, lowered, new wheels, body kit…"
                      maxLength={200}
                      style={INP}
                    />
                  </div>

                  <div>
                    <div style={LABEL}>
                      When are you planning to arrive?{' '}
                      <span style={{ color: '#bbb', textTransform: 'none', letterSpacing: 0, fontSize: '10px' }}>optional</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {[
                        { val: 'opening',    label: 'Right at opening' },
                        { val: 'first_hour', label: 'Within the first hour' },
                        { val: 'later',      label: 'Later on' },
                      ].map(opt => (
                        <ToggleBtn key={opt.val} fullWidth selected={arrival === opt.val} onClick={() => setArrival(opt.val)}>
                          {opt.label}
                        </ToggleBtn>
                      ))}
                    </div>
                  </div>
                </>}

                {err && <p style={{ fontSize: '12px', color: '#d06070', margin: 0 }}>{err}</p>}

                <button
                  type="submit"
                  disabled={isDisabled}
                  style={{
                    padding: '1rem', border: 'none',
                    background: isDisabled ? 'rgba(15,30,20,0.35)' : '#0F1E14',
                    color: '#F5F1EC', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase',
                    fontWeight: '600', cursor: isDisabled ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-inter),sans-serif', transition: 'background 0.2s', borderRadius: 0,
                  }}
                >
                  {submitting ? 'Confirming…' : 'Confirm My Spot'}
                </button>

                {isDisabled && !submitting && (
                  <p style={{ fontSize: '11px', color: '#bbb', margin: '-0.75rem 0 0', textAlign: 'center' }}>
                    Select an option above to continue
                  </p>
                )}
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#0F1E14', padding: '1.25rem 2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: 'rgba(245,241,236,0.25)', margin: 0 }}>© 2026 Canvas Routes. Montreal, QC.</p>
      </div>
    </div>
  )
}
