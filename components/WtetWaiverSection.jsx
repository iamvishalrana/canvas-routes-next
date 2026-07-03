'use client'
import { useState } from 'react'
import SectionCard from './WtetSectionCard'

const inp = {
  width: '100%', padding: '0.75rem 0.9rem', border: '1px solid rgba(0,0,0,0.14)',
  background: '#fff', fontSize: '16px', fontFamily: 'var(--font-inter), sans-serif',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const label = { display: 'block', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }

function emptyPassenger() { return { name: '', age: '' } }

// identifier: { email } or { token } — whichever entry point (email lookup or
// the emailed check-in link) resolved this participant.
export default function WtetWaiverSection({ waiverText, identifier, waiver, carYear, carMake, carModel, onSaved }) {
  const [fullName, setFullName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [vehicleYear, setVehicleYear] = useState(carYear || '')
  const [vehicleMake, setVehicleMake] = useState(carMake || '')
  const [vehicleModel, setVehicleModel] = useState(carModel || '')
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
          ...identifier,
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
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (waiver) {
    return (
      <SectionCard title="Liability Waiver" done doneLabel="Signed" pendingLabel="Outstanding">
        <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.8 }}>
          <div style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontSize: '28px', color: '#1a1a1a', marginBottom: '0.5rem' }}>
            {waiver.full_name}
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            Signed on {new Date(waiver.signed_at).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}.
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
          <label style={label}>Signature — type your full legal name *</label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Type your full name"
            style={{
              ...inp,
              fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
              fontSize: '26px',
              padding: '0.5rem 0.9rem',
              borderBottom: '2px solid rgba(197,168,130,0.6)',
              borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              background: 'rgba(197,168,130,0.03)',
            }}
          />
          <div style={{ fontSize: '10px', color: '#bbb', marginTop: '0.3rem' }}>Typing your name here counts as your legal signature.</div>
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
