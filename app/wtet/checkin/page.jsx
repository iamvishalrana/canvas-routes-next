'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import SiteNav from '../../../components/SiteNav'
import SiteFooter from '../../../components/SiteFooter'
import WtetSectionCard from '../../../components/WtetSectionCard'
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

function passengerLabel(i) {
  return i === 0 ? 'Driver' : `Passenger ${i + 1}`
}

function emptyPassenger() { return { name: '', age: '' } }

function parsePassengerCount(str) {
  const n = parseInt(str)
  return isNaN(n) ? 1 : Math.max(1, n)
}

// Trip Details — passengers/dietary/WhatsApp. Uses the token directly (no
// shared component — this data model is specific to this page).
function TripDetailsSection({ token, alreadyCompleted, initialPassengerCount, onSaved }) {
  const [editing, setEditing] = useState(!alreadyCompleted)
  const [passengerCount] = useState(initialPassengerCount)
  const [dietary, setDietary] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [passengers, setPassengers] = useState(() => Array.from({ length: initialPassengerCount }, emptyPassenger))
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  function updatePassenger(i, field, val) {
    setPassengers(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p))
    setFieldErrors(prev => { const n = { ...prev }; delete n[`p_${i}_${field}`]; return n })
  }
  function addPassenger() { setPassengers(prev => [...prev, emptyPassenger()]) }
  function removePassenger(i) {
    if (passengers.length <= 1) return
    setPassengers(prev => prev.filter((_, idx) => idx !== i))
  }

  function validate() {
    const errs = {}
    passengers.forEach((p, i) => {
      if (!p.name.trim()) errs[`p_${i}_name`] = true
      const ageNum = parseInt(p.age)
      if (!p.age.toString().trim() || isNaN(ageNum) || ageNum < 1 || ageNum > 120) errs[`p_${i}_age`] = true
    })
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
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
      onSaved()
      setEditing(false)
    } catch {
      setSubmitError('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!editing) {
    return (
      <WtetSectionCard title="Trip Details" done doneLabel="Complete" pendingLabel="Outstanding">
        <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.8 }}>
          Passengers, dietary needs, and WhatsApp number on file. Contact jerry@canvasroutes.com if anything's changed.
        </div>
      </WtetSectionCard>
    )
  }

  return (
    <WtetSectionCard title="Trip Details" done={false} doneLabel="Complete" pendingLabel="Not submitted">
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1.1rem' }}>
            Passengers — including driver
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {passengers.map((p, i) => (
              <div key={i} style={{ border: '0.5px solid rgba(0,0,0,0.1)', background: '#fafaf8', padding: '1rem 1.1rem' }}>
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
                    <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }}>Full name *</label>
                    <input type="text" autoComplete={i === 0 ? 'name' : 'off'} value={p.name} onChange={e => updatePassenger(i, 'name', e.target.value)} placeholder="Full name"
                      style={{ ...inp, border: `1px solid ${fieldErrors[`p_${i}_name`] ? 'rgba(208,96,112,0.7)' : 'rgba(0,0,0,0.14)'}` }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }}>Age *</label>
                    <input type="number" min="1" max="120" value={p.age} onChange={e => updatePassenger(i, 'age', e.target.value)} placeholder="—"
                      style={{ ...inp, border: `1px solid ${fieldErrors[`p_${i}_age`] ? 'rgba(208,96,112,0.7)' : 'rgba(0,0,0,0.14)'}` }} />
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
          <p style={{ fontSize: '12px', color: '#bbb', margin: '0.5rem 0 0', lineHeight: '1.6' }}>Include everyone in the car — driver first, then any passengers.</p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', marginBottom: '0.5rem' }}>Any dietary allergies or restrictions?</label>
          <input type="text" value={dietary} onChange={e => setDietary(e.target.value)} placeholder="e.g. nut allergy, vegetarian… or leave blank" style={inp} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', marginBottom: '0.5rem' }}>WhatsApp number for group chat (optional)</label>
          <input type="tel" autoComplete="tel" inputMode="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+1 514 555 0100" style={inp} />
          <p style={{ fontSize: '12px', color: '#aaa', margin: '0.5rem 0 0', lineHeight: '1.6' }}>We'll add you to the Canvas Routes WhatsApp group for this trip.</p>
        </div>

        <div style={{ padding: '1rem 1.1rem', background: 'rgba(197,168,130,0.07)', border: '0.5px solid rgba(197,168,130,0.3)' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Car photo</div>
          <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.75', margin: 0 }}>
            Text a photo of your car to <a href="mailto:jerry@canvasroutes.com" style={{ color: '#7B5B2E', textDecoration: 'none', fontWeight: '500' }}>jerry@canvasroutes.com</a> so we can feature it. You can skip this if you've attended a previous Canvas Routes event.
          </p>
        </div>

        {submitError && <div style={{ fontSize: '13px', color: '#7B2032', padding: '0.75rem 1rem', background: 'rgba(123,32,50,0.05)', border: '0.5px solid rgba(123,32,50,0.2)' }}>{submitError}</div>}

        <button type="submit" disabled={submitting}
          style={{ padding: '0.85rem 1.75rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1, alignSelf: 'flex-start' }}>
          {submitting ? 'Saving…' : 'Save Trip Details'}
        </button>
      </form>
    </WtetSectionCard>
  )
}

function WtetCheckinContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('t')

  const [loadState, setLoadState] = useState('loading')
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!token) { setLoadState('not_found'); return }
    fetch(`/api/wtet-checkin?t=${encodeURIComponent(token)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        setData(d)
        setLoadState('ready')
      })
      .catch(() => setLoadState('not_found'))
  }, [token])

  const firstName = data?.name?.trim().split(' ')[0] || ''
  const allDone = data && !!data.alreadyCompleted && !!data.waiver && !!data.lunch

  return (
    <main style={{ maxWidth: '620px', margin: '0 auto', padding: '7rem 1.5rem 6rem' }}>

      {loadState === 'loading' && (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ fontSize: '13px', color: '#bbb', letterSpacing: '0.08em' }}>Loading…</div>
        </div>
      )}

      {loadState === 'not_found' && (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '0 auto 2rem' }} />
          <div style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '2rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '1rem' }}>
            Link not found.
          </div>
          <p style={{ fontSize: '14px', color: '#888', lineHeight: '1.8', maxWidth: '380px', margin: '0 auto' }}>
            This check-in link doesn't match any registration. If you think this is a mistake, reply to your confirmation email or contact{' '}
            <a href="mailto:jerry@canvasroutes.com" style={{ color: '#7B5B2E', textDecoration: 'underline', textUnderlineOffset: '2px' }}>jerry@canvasroutes.com</a>.
          </p>
        </div>
      )}

      {loadState === 'ready' && data && (
        <>
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1rem' }}>
              Canvas Routes · July 5, 2026
            </div>
            <h1 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '2.2rem', fontWeight: '300', color: '#0F1E14', margin: '0 0 0.5rem', lineHeight: '1.2' }}>
              {firstName ? `Hi ${firstName}` : 'Whips to Eastern Townships'}
            </h1>
            <div style={{ width: '30px', height: '0.5px', background: '#c5a882', margin: '1.25rem 0' }} />
            {allDone ? (
              <p style={{ fontSize: '14px', color: '#3B6B2F', lineHeight: '1.8', margin: 0 }}>
                You're all set — trip details, waiver, and lunch are complete. See you on July 5.
              </p>
            ) : (
              <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.8', margin: 0 }}>
                Please complete the item(s) below marked outstanding before the event.
              </p>
            )}
          </div>

          <TripDetailsSection
            token={token}
            alreadyCompleted={data.alreadyCompleted}
            initialPassengerCount={parsePassengerCount(data.passengers)}
            onSaved={() => setData(prev => ({ ...prev, alreadyCompleted: true }))}
          />

          <WtetWaiverSection
            waiverText={WTET_WAIVER_TEXT}
            identifier={{ token }}
            waiver={data.waiver}
            carYear={data.carYear}
            carMake={data.carMake}
            carModel={data.carModel}
            onSaved={waiver => setData(prev => ({ ...prev, waiver }))}
          />

          <WtetLunchSection
            identifier={{ token }}
            lunch={data.lunch}
            lunchOptions={data.lunchOptions}
            lunchCutoff={data.lunchCutoff}
            lunchLocked={data.lunchLocked}
            onSaved={lunch => setData(prev => ({ ...prev, lunch }))}
          />
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
      <SiteFooter />
    </div>
  )
}
