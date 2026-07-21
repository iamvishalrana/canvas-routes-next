'use client'
import { useState } from 'react'
import SectionCard from './WtetSectionCard'
import { CHECKIN_T } from '../lib/genericCheckinContent'
import { useLanguage } from '../lib/i18n/LanguageContext'

const inp = {
  width: '100%', padding: '0.75rem 0.9rem', border: '1px solid rgba(0,0,0,0.14)',
  background: '#fff', fontSize: '15px', fontFamily: 'var(--font-inter), sans-serif',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}

function emptyPassenger() { return { name: '', age: '' } }

function parsePassengerCount(str, max) {
  const n = parseInt(str)
  return isNaN(n) ? 1 : Math.min(max, Math.max(1, n))
}

// identifier: { email, eventId }
export default function CheckinTripDetailsSection({ identifier, alreadyCompleted, initialPassengerCount, maxPassengers, onSaved }) {
  const { lang } = useLanguage()
  const t = CHECKIN_T[lang]
  const [editing, setEditing] = useState(!alreadyCompleted)
  const [dietary, setDietary] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [passengers, setPassengers] = useState(() => Array.from({ length: parsePassengerCount(initialPassengerCount, maxPassengers) }, emptyPassenger))
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  function updatePassenger(i, field, val) {
    setPassengers(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p))
    setFieldErrors(prev => { const n = { ...prev }; delete n[`p_${i}_${field}`]; return n })
  }
  function addPassenger() { setPassengers(prev => prev.length >= maxPassengers ? prev : [...prev, emptyPassenger()]) }
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
      const res = await fetch(`/api/checkin/${identifier.eventId}/trip-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: identifier.email,
          dietary: dietary.trim() || null,
          whatsapp: whatsapp.trim() || null,
          passengers_list: passengers,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setSubmitError(d.error || t.genericError)
        return
      }
      onSaved(passengers)
      setEditing(false)
    } catch {
      setSubmitError(t.networkError)
    } finally {
      setSubmitting(false)
    }
  }

  if (!editing) {
    return (
      <SectionCard title={t.tripTitle} done doneLabel={t.tripDoneLabel} pendingLabel={t.tripPendingLabel}>
        <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.8 }}>{t.tripDoneMsg}</div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title={t.tripTitle} done={false} doneLabel={t.tripDoneLabel} pendingLabel={t.tripPendingLabel}>
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '1.1rem' }}>
            {t.passengersHeader}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {passengers.map((p, i) => (
              <div key={i} className="wtetci-card" style={{ border: '0.5px solid rgba(0,0,0,0.1)', background: '#fafaf8', padding: '1rem 1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: i === 0 ? '#c5a882' : '#aaa' }}>
                    {i === 0 ? t.driverLabel : t.passengerLabel(i + 1)}
                  </span>
                  {i > 0 && (
                    <button type="button" onClick={() => removePassenger(i)} className="wtetci-btn-ghost"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#bbb', padding: '0 2px', fontFamily: 'var(--font-inter), sans-serif', lineHeight: 1 }}>
                      {t.removeBtn}
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '0.6rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }}>{t.fullNameLabel}</label>
                    <input type="text" autoComplete={i === 0 ? 'name' : 'off'} className="wtetci-input" value={p.name} onChange={e => updatePassenger(i, 'name', e.target.value)} placeholder={t.fullNameLabel.replace(' *', '')}
                      style={{ ...inp, border: `1px solid ${fieldErrors[`p_${i}_name`] ? 'rgba(208,96,112,0.7)' : 'rgba(0,0,0,0.14)'}` }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }}>{t.ageLabel}</label>
                    <input type="number" min="1" max="120" className="wtetci-input" value={p.age} onChange={e => updatePassenger(i, 'age', e.target.value)} placeholder="—"
                      style={{ ...inp, border: `1px solid ${fieldErrors[`p_${i}_age`] ? 'rgba(208,96,112,0.7)' : 'rgba(0,0,0,0.14)'}` }} />
                  </div>
                </div>
                {(fieldErrors[`p_${i}_name`] || fieldErrors[`p_${i}_age`]) && (
                  <div className="wtetci-fade-in" style={{ fontSize: '11px', color: '#d06070', marginTop: '0.4rem' }}>
                    {fieldErrors[`p_${i}_name`] && fieldErrors[`p_${i}_age`] ? t.passengerErrBoth : fieldErrors[`p_${i}_name`] ? t.passengerErrName : t.passengerErrAge}
                  </div>
                )}
              </div>
            ))}
          </div>
          {passengers.length >= maxPassengers ? (
            <p style={{ fontSize: '12px', color: '#8A6535', margin: '0.65rem 0 0', lineHeight: '1.6' }}>{t.maxPassengersNote(maxPassengers)}</p>
          ) : (
            <button type="button" onClick={addPassenger} className="wtetci-btn-ghost"
              style={{ marginTop: '0.65rem', background: 'none', border: '0.5px solid rgba(0,0,0,0.2)', padding: '0.5rem 1rem', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif' }}>
              {t.addPassengerBtn}
            </button>
          )}
          <p style={{ fontSize: '12px', color: '#888', margin: '0.5rem 0 0', lineHeight: '1.6' }}>{t.passengersHint}</p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', marginBottom: '0.5rem' }}>{t.dietaryLabel}</label>
          <input type="text" className="wtetci-input" value={dietary} onChange={e => setDietary(e.target.value)} placeholder={t.dietaryPlaceholder} style={inp} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', marginBottom: '0.5rem' }}>{t.whatsappLabel}</label>
          <input type="tel" autoComplete="tel" inputMode="tel" className="wtetci-input" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder={t.whatsappPlaceholder} style={inp} />
          <p style={{ fontSize: '12px', color: '#888', margin: '0.5rem 0 0', lineHeight: '1.6' }}>{t.whatsappHint}</p>
        </div>

        {submitError && <div className="wtetci-fade-in" style={{ fontSize: '13px', color: '#93333E', padding: '0.75rem 1rem', background: 'rgba(147,51,62,0.05)', border: '0.5px solid rgba(147,51,62,0.2)' }}>{submitError}</div>}

        <button type="submit" disabled={submitting} className="wtetci-btn-primary"
          style={{ padding: '0.85rem 1.75rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1, alignSelf: 'flex-start' }}>
          {submitting ? t.savingBtn : t.saveTripBtn}
        </button>
      </form>
    </SectionCard>
  )
}
