'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import SiteNav from '../../../components/SiteNav'

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

function passengerLabel(i) {
  return i === 0 ? 'Driver' : `Passenger ${i + 1}`
}

function emptyPassenger() { return { name: '', age: '' } }

function parsePassengerCount(str) {
  const n = parseInt(str)
  return isNaN(n) ? 1 : Math.max(1, n)
}

function WtetCheckinContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('t')

  const [loadState, setLoadState]     = useState('loading')
  const [personName, setPersonName]   = useState('')
  const [passengerCount, setPassengerCount] = useState(1)
  const [dietary, setDietary]         = useState('')
  const [whatsapp, setWhatsapp]       = useState('')
  const [passengers, setPassengers]   = useState([emptyPassenger()])
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitted, setSubmitted]     = useState(false)

  useEffect(() => {
    if (!token) { setLoadState('not_found'); return }
    fetch(`/api/wtet-checkin?t=${encodeURIComponent(token)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setPersonName(data.name || '')
        if (data.alreadyCompleted) {
          setLoadState('already_done')
        } else {
          const count = parsePassengerCount(data.passengers)
          setPassengerCount(count)
          setPassengers(Array.from({ length: count }, emptyPassenger))
          setLoadState('form')
        }
      })
      .catch(() => setLoadState('not_found'))
  }, [token])

  function updatePassenger(i, field, val) {
    setPassengers(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p))
    setFieldErrors(prev => { const n = { ...prev }; delete n[`p_${i}_${field}`]; return n })
  }

  function addPassenger() {
    setPassengers(prev => [...prev, emptyPassenger()])
  }

  function removePassenger(i) {
    if (passengers.length <= 1) return
    setPassengers(prev => prev.filter((_, idx) => idx !== i))
    setFieldErrors(prev => {
      const n = { ...prev }
      delete n[`p_${i}_name`]; delete n[`p_${i}_age`]
      return n
    })
  }

  function validate() {
    const errs = {}
    passengers.forEach((p, i) => {
      if (!p.name.trim()) errs[`p_${i}_name`] = true
      if (!p.age.toString().trim()) errs[`p_${i}_age`] = true
    })
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    if (!token) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/wtet-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          dietary:         dietary.trim() || null,
          whatsapp:        whatsapp.trim() || null,
          passengers_list: passengers,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setSubmitError(d.error || 'Something went wrong. Please try again.')
        return
      }
      setSubmitted(true)
    } catch {
      setSubmitError('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const firstName = personName?.trim().split(' ')[0] || ''

  return (
    <main style={{ maxWidth: '540px', margin: '0 auto', padding: '7rem 1.5rem 6rem' }}>

      {/* Loading */}
      {loadState === 'loading' && (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ fontSize: '13px', color: '#bbb', letterSpacing: '0.08em' }}>Loading…</div>
        </div>
      )}

      {/* Not found */}
      {loadState === 'not_found' && (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '0 auto 2rem' }} />
          <div style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '2rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '1rem' }}>
            Link not found.
          </div>
          <p style={{ fontSize: '14px', color: '#888', lineHeight: '1.8', maxWidth: '380px', margin: '0 auto' }}>
            This check-in link doesn&apos;t match any registration. If you think this is a mistake, reply to your confirmation email or contact{' '}
            <a href="mailto:jerry@canvasroutes.com" style={{ color: '#7B5B2E', textDecoration: 'underline', textUnderlineOffset: '2px' }}>jerry@canvasroutes.com</a>.
          </p>
        </div>
      )}

      {/* Already completed */}
      {loadState === 'already_done' && (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', background: 'rgba(59,107,47,0.1)', border: '0.5px solid rgba(59,107,47,0.25)', borderRadius: '50%', marginBottom: '1.5rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B6B2F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '2rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.75rem' }}>
            Check-in complete{firstName ? `, ${firstName}` : ''}.
          </div>
          <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '1rem auto 1.25rem' }} />
          <p style={{ fontSize: '14px', color: '#888', lineHeight: '1.8', maxWidth: '380px', margin: '0 auto' }}>
            You&apos;ve already completed the early check-in for Whips to Eastern Townships. We&apos;ll see you on July 5.
          </p>
        </div>
      )}

      {/* Success */}
      {submitted && (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', background: 'rgba(59,107,47,0.1)', border: '0.5px solid rgba(59,107,47,0.25)', borderRadius: '50%', marginBottom: '1.5rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B6B2F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '2.2rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.75rem' }}>
            You&apos;re all set{firstName ? `, ${firstName}` : ''}.
          </div>
          <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '1rem auto 1.25rem' }} />
          <p style={{ fontSize: '14px', color: '#888', lineHeight: '1.8', maxWidth: '380px', margin: '0 auto 1rem' }}>
            Early check-in complete. We&apos;ll have everything ready for you on July 5.
          </p>
          <p style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.7', maxWidth: '360px', margin: '0 auto' }}>
            Questions? Reach out at{' '}
            <a href="mailto:jerry@canvasroutes.com" style={{ color: '#7B5B2E', textDecoration: 'underline', textUnderlineOffset: '2px' }}>jerry@canvasroutes.com</a>.
          </p>
        </div>
      )}

      {/* Form */}
      {loadState === 'form' && !submitted && (
        <>
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>
              Canvas Routes · July 5, 2026
            </div>
            <h1 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '2.2rem', fontWeight: '300', color: '#0F1E14', margin: '0 0 0.5rem', lineHeight: '1.2' }}>
              WTET Early Check-in
            </h1>
            <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '1.25rem 0' }} />
            {firstName && (
              <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.8', margin: 0 }}>
                Hi {firstName} — fill in a couple of quick details so we can get everything ready for July 5.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* ── Passengers ── */}
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1.1rem' }}>
                Passengers — including driver
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {passengers.map((p, i) => (
                  <div key={i} style={{ border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff', padding: '1rem 1.1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: i === 0 ? '#c5a882' : '#aaa' }}>
                        {passengerLabel(i)}
                      </span>
                      {i > 0 && (
                        <button type="button" onClick={() => removePassenger(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#bbb', padding: '0 2px', fontFamily: 'var(--font-inter), sans-serif', lineHeight: 1 }}>
                          Remove
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '0.6rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }}>
                          Full name *
                        </label>
                        <input
                          type="text"
                          autoComplete={i === 0 ? 'name' : 'off'}
                          value={p.name}
                          onChange={e => updatePassenger(i, 'name', e.target.value)}
                          placeholder="Full name"
                          style={{ ...inp, border: `1px solid ${fieldErrors[`p_${i}_name`] ? 'rgba(208,96,112,0.7)' : 'rgba(0,0,0,0.14)'}` }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }}>
                          Age *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={p.age}
                          onChange={e => updatePassenger(i, 'age', e.target.value)}
                          placeholder="—"
                          style={{ ...inp, border: `1px solid ${fieldErrors[`p_${i}_age`] ? 'rgba(208,96,112,0.7)' : 'rgba(0,0,0,0.14)'}` }}
                        />
                      </div>
                    </div>
                    {(fieldErrors[`p_${i}_name`] || fieldErrors[`p_${i}_age`]) && (
                      <div style={{ fontSize: '11px', color: '#d06070', marginTop: '0.4rem' }}>
                        {fieldErrors[`p_${i}_name`] && fieldErrors[`p_${i}_age`] ? 'Name and age are required.' : fieldErrors[`p_${i}_name`] ? 'Name is required.' : 'Age is required.'}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button type="button" onClick={addPassenger}
                style={{ marginTop: '0.65rem', background: 'none', border: '0.5px solid rgba(0,0,0,0.2)', padding: '0.5rem 1rem', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif' }}>
                + Add passenger
              </button>
              <p style={{ fontSize: '12px', color: '#bbb', margin: '0.5rem 0 0', lineHeight: '1.6' }}>
                Include everyone in the car — driver first, then any passengers.
              </p>
            </div>

            {/* ── Dietary ── */}
            <div>
              <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', marginBottom: '0.5rem' }}>
                Any dietary allergies or restrictions?
              </label>
              <input
                type="text"
                value={dietary}
                onChange={e => setDietary(e.target.value)}
                placeholder="e.g. nut allergy, vegetarian… or leave blank"
                style={inp}
              />
            </div>

            {/* ── WhatsApp ── */}
            <div>
              <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', marginBottom: '0.5rem' }}>
                WhatsApp number for group chat (optional)
              </label>
              <input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="+1 514 555 0100"
                style={inp}
              />
              <p style={{ fontSize: '12px', color: '#aaa', margin: '0.5rem 0 0', lineHeight: '1.6' }}>
                We&apos;ll add you to the Canvas Routes WhatsApp group for this trip.
              </p>
            </div>

            {/* ── Car photo note ── */}
            <div style={{ padding: '1rem 1.1rem', background: 'rgba(197,168,130,0.07)', border: '0.5px solid rgba(197,168,130,0.3)' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Car photo</div>
              <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.75', margin: 0 }}>
                Text a photo of your car to{' '}
                <a href="mailto:jerry@canvasroutes.com" style={{ color: '#7B5B2E', textDecoration: 'none', fontWeight: '500' }}>jerry@canvasroutes.com</a>{' '}
                so we can feature it. You can skip this if you&apos;ve attended a previous Canvas Routes event — we may already have your car&apos;s photo.
              </p>
            </div>

            {/* ── Error ── */}
            {submitError && (
              <div style={{ fontSize: '13px', color: '#7B2032', padding: '0.75rem 1rem', background: 'rgba(123,32,50,0.05)', border: '0.5px solid rgba(123,32,50,0.2)' }}>
                {submitError}
              </div>
            )}

            {/* ── Submit ── */}
            <button type="submit" disabled={submitting}
              style={{
                padding: '0.9rem 2rem', background: '#0F1E14', color: '#F5F1EC', border: 'none',
                fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase',
                fontFamily: 'var(--font-inter), sans-serif', cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.7 : 1, transition: 'opacity 0.15s', alignSelf: 'flex-start',
              }}>
              {submitting ? 'Saving…' : 'Complete Check-in'}
            </button>

          </form>
        </>
      )}
    </main>
  )
}

export default function WtetCheckinPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F1EC', fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
      <SiteNav links={NAV_LINKS} />
      <Suspense fallback={
        <div style={{ maxWidth: '540px', margin: '0 auto', padding: '7rem 1.5rem 6rem', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#bbb', letterSpacing: '0.08em' }}>Loading…</div>
        </div>
      }>
        <WtetCheckinContent />
      </Suspense>
    </div>
  )
}
