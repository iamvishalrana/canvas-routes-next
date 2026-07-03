'use client'
import { useState } from 'react'
import SiteNav from '../../../components/SiteNav'
import SiteFooter from '../../../components/SiteFooter'
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

function StatusPill({ done, doneLabel, pendingLabel }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase',
      padding: '3px 10px', borderRadius: '99px',
      color: done ? '#3B6B2F' : '#8A6535',
      border: `0.5px solid ${done ? 'rgba(59,107,47,0.3)' : 'rgba(197,168,130,0.5)'}`,
      background: done ? 'rgba(59,107,47,0.06)' : 'rgba(197,168,130,0.08)',
    }}>
      {done ? (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/></svg>
      )}
      {done ? doneLabel : pendingLabel}
    </span>
  )
}

function SectionCard({ title, done, doneLabel, pendingLabel, children }) {
  return (
    <div style={{ border: `0.5px solid ${done ? 'rgba(59,107,47,0.25)' : 'rgba(197,168,130,0.35)'}`, background: '#fff', marginBottom: '1.5rem' }}>
      <div style={{ padding: '1.1rem 1.4rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', fontFamily: 'var(--font-inter), sans-serif' }}>{title}</div>
        <StatusPill done={done} doneLabel={doneLabel} pendingLabel={pendingLabel} />
      </div>
      <div style={{ padding: '1.4rem' }}>{children}</div>
    </div>
  )
}

function emptyPassenger() { return { name: '', age: '' } }

function WaiverSection({ waiverText, data, onSaved }) {
  const [open, setOpen] = useState(!data.waiver)
  const [fullName, setFullName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [vehicleYear, setVehicleYear] = useState(data.carYear || '')
  const [vehicleMake, setVehicleMake] = useState(data.carMake || '')
  const [vehicleModel, setVehicleModel] = useState(data.carModel || '')
  const [passengers, setPassengers] = useState([])
  const [hasPassengers, setHasPassengers] = useState(false)
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  function updatePassenger(i, field, val) {
    setPassengers(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p))
  }
  function addPassenger() { setPassengers(prev => [...prev, emptyPassenger()]) }
  function removePassenger(i) { setPassengers(prev => prev.filter((_, idx) => idx !== i)) }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!agreed) { setError('You must check the box confirming you have read and agree to the waiver.'); return }
    if (!fullName.trim()) { setError('Please type your full name as your signature.'); return }
    if (!emergencyName.trim() || !emergencyPhone.trim()) { setError('Emergency contact name and phone are required.'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/wtet-registration/waiver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          fullName,
          agreed: true,
          vehicleYear, vehicleMake, vehicleModel,
          passengers: hasPassengers ? passengers : [],
          emergencyContactName: emergencyName,
          emergencyContactPhone: emergencyPhone,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'Something went wrong.'); return }
      onSaved(d.waiver)
      setOpen(false)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (data.waiver) {
    return (
      <SectionCard title="Liability Waiver" done doneLabel="Signed" pendingLabel="Outstanding">
        <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.8 }}>
          <div style={{ marginBottom: '0.5rem' }}>
            Signed by <strong style={{ color: '#1a1a1a' }}>{data.waiver.full_name}</strong> on{' '}
            {new Date(data.waiver.signed_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}.
          </div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>This waiver is locked and cannot be edited. Contact jerry@canvasroutes.com for corrections.</div>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Liability Waiver" done={false} doneLabel="Signed" pendingLabel="Not signed">
      <div style={{ maxHeight: '260px', overflowY: 'auto', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1rem 1.1rem', background: '#fafaf8', fontSize: '12px', color: '#555', lineHeight: 1.75, whiteSpace: 'pre-wrap', marginBottom: '1.25rem' }}>
        {waiverText}
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', fontSize: '13px', color: '#333', lineHeight: 1.6 }}>
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: '3px', width: '15px', height: '15px', flexShrink: 0, accentColor: '#45643c' }} />
          I have read and agree to the terms above.
        </label>

        <div>
          <label style={label}>Full legal name (signature) *</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Type your full name" style={inp} />
        </div>

        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.6rem' }}>Vehicle</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
            <div><label style={label}>Year</label><input type="text" value={vehicleYear} onChange={e => setVehicleYear(e.target.value)} style={inp} /></div>
            <div><label style={label}>Make</label><input type="text" value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} style={inp} /></div>
            <div><label style={label}>Model</label><input type="text" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} style={inp} /></div>
          </div>
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '12px', color: '#666', marginBottom: hasPassengers ? '0.75rem' : 0 }}>
            <input type="checkbox" checked={hasPassengers} onChange={e => { setHasPassengers(e.target.checked); if (e.target.checked && passengers.length === 0) setPassengers([emptyPassenger()]) }} style={{ width: '14px', height: '14px', accentColor: '#45643c' }} />
            I'm bringing passenger(s)
          </label>
          {hasPassengers && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {passengers.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 24px', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="text" value={p.name} onChange={e => updatePassenger(i, 'name', e.target.value)} placeholder="Passenger name" style={inp} />
                  <input type="number" min="0" max="120" value={p.age} onChange={e => updatePassenger(i, 'age', e.target.value)} placeholder="Age" style={inp} />
                  <button type="button" onClick={() => removePassenger(i)} style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
                </div>
              ))}
              <button type="button" onClick={addPassenger} style={{ alignSelf: 'flex-start', background: 'none', border: '0.5px solid rgba(0,0,0,0.18)', padding: '0.4rem 0.85rem', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', cursor: 'pointer' }}>+ Add passenger</button>
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.6rem' }}>Emergency Contact</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            <div><label style={label}>Name *</label><input type="text" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} style={inp} /></div>
            <div><label style={label}>Phone *</label><input type="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="+1 514 000 0000" style={inp} /></div>
          </div>
        </div>

        {error && <div style={{ fontSize: '13px', color: '#7B2032', padding: '0.7rem 0.9rem', background: 'rgba(123,32,50,0.05)', border: '0.5px solid rgba(123,32,50,0.2)' }}>{error}</div>}

        <button type="submit" disabled={submitting} style={{ alignSelf: 'flex-start', padding: '0.85rem 1.75rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? 'Signing…' : 'Sign Waiver'}
        </button>
      </form>
    </SectionCard>
  )
}

function LunchSection({ data, onSaved }) {
  const [dishId, setDishId] = useState(data.lunch?.dish_id || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(!data.lunch)

  const cutoffDate = new Date(data.lunchCutoff)
  const cutoffStr = cutoffDate.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!dishId) { setError('Please select a dish.'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/wtet-registration/lunch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, dishId }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'Something went wrong.'); return }
      onSaved(d.lunch)
      setEditing(false)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (data.lunch && !editing) {
    return (
      <SectionCard title="Lunch Preference — Auberge McGowan" done doneLabel="Selected" pendingLabel="Outstanding">
        <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.8 }}>
          <div style={{ marginBottom: '0.5rem' }}>You've selected <strong style={{ color: '#1a1a1a' }}>{data.lunch.dish_name}</strong>.</div>
          {data.lunchLocked ? (
            <div style={{ fontSize: '12px', color: '#aaa' }}>Selections are now locked. Contact jerry@canvasroutes.com if you need to make a change.</div>
          ) : (
            <>
              <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '0.75rem' }}>You can change your selection until {cutoffStr}.</div>
              <button onClick={() => setEditing(true)} style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.18)', padding: '0.5rem 1.1rem', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#666', cursor: 'pointer' }}>Change selection</button>
            </>
          )}
        </div>
      </SectionCard>
    )
  }

  if (data.lunchLocked && !data.lunch) {
    return (
      <SectionCard title="Lunch Preference — Auberge McGowan" done={false} doneLabel="Selected" pendingLabel="Deadline passed">
        <div style={{ fontSize: '13px', color: '#7B2032', lineHeight: 1.8 }}>
          The deadline to select a lunch dish ({cutoffStr}) has passed. Contact{' '}
          <a href="mailto:jerry@canvasroutes.com" style={{ color: '#7B2032', textDecoration: 'underline' }}>jerry@canvasroutes.com</a> if you haven't chosen yet.
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Lunch Preference — Auberge McGowan" done={false} doneLabel="Selected" pendingLabel="Not selected">
      <p style={{ fontSize: '12px', color: '#999', marginBottom: '1.1rem' }}>Choose one. You can change this until {cutoffStr}.</p>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {data.lunchOptions.map(dish => (
          <label key={dish.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.9rem 1rem', border: `0.5px solid ${dishId === dish.id ? 'rgba(197,168,130,0.6)' : 'rgba(0,0,0,0.1)'}`, background: dishId === dish.id ? 'rgba(197,168,130,0.06)' : '#fff', cursor: 'pointer' }}>
            <input type="radio" name="dish" value={dish.id} checked={dishId === dish.id} onChange={() => setDishId(dish.id)} style={{ marginTop: '3px', width: '15px', height: '15px', flexShrink: 0, accentColor: '#45643c' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.2rem' }}>{dish.name}</div>
              <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.6 }}>{dish.description}</div>
            </div>
          </label>
        ))}
        {error && <div style={{ fontSize: '13px', color: '#7B2032', padding: '0.7rem 0.9rem', background: 'rgba(123,32,50,0.05)', border: '0.5px solid rgba(123,32,50,0.2)' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button type="submit" disabled={submitting} style={{ padding: '0.85rem 1.75rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Saving…' : 'Save Selection'}
          </button>
          {data.lunch && (
            <button type="button" onClick={() => { setEditing(false); setError(null) }} style={{ padding: '0.85rem 1.5rem', background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', cursor: 'pointer' }}>Cancel</button>
          )}
        </div>
      </form>
    </SectionCard>
  )
}

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

            <WaiverSection
              waiverText={WTET_WAIVER_TEXT}
              data={data}
              onSaved={waiver => setData(prev => ({ ...prev, waiver }))}
            />
            <LunchSection
              data={data}
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
