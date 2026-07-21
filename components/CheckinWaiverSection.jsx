'use client'
import { useState } from 'react'
import SectionCard from './WtetSectionCard'
import { CHECKIN_T, checkinDateLocale } from '../lib/genericCheckinContent'
import { useLanguage } from '../lib/i18n/LanguageContext'

const inp = {
  width: '100%', padding: '0.75rem 0.9rem', border: '1px solid rgba(0,0,0,0.14)',
  background: '#fff', fontSize: '15px', fontFamily: 'var(--font-inter), sans-serif',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const label = { display: 'block', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }

function emptyPassenger() { return { name: '', age: '' } }

// identifier: { email, eventId }
// tripPassengers: extra passengers (excluding the driver) already entered in
// Trip Details, if that section ran first — pre-fills this section instead
// of asking for the same names again, while staying editable in case the
// people riding along changed since.
export default function CheckinWaiverSection({ waiverText, identifier, waiver, carYear, carMake, carModel, maxPassengers, tripPassengers, onSaved }) {
  const { lang } = useLanguage()
  const t = CHECKIN_T[lang]
  const [fullName, setFullName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [vehicleYear, setVehicleYear] = useState(carYear || '')
  const [vehicleMake, setVehicleMake] = useState(carMake || '')
  const [vehicleModel, setVehicleModel] = useState(carModel || '')
  const prefilledExtra = (tripPassengers || []).filter(p => p.name?.trim())
  const [passengers, setPassengers] = useState(() => prefilledExtra.length ? prefilledExtra.map(p => ({ name: p.name, age: String(p.age || '') })) : [])
  const [hasPassengers, setHasPassengers] = useState(() => prefilledExtra.length > 0)
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const maxExtra = Math.max(0, (maxPassengers || 2) - 1)

  function updatePassenger(i, field, val) {
    setPassengers(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p))
  }
  function addPassenger() { setPassengers(prev => prev.length >= maxExtra ? prev : [...prev, emptyPassenger()]) }
  function removePassenger(i) { setPassengers(prev => prev.filter((_, idx) => idx !== i)) }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!agreed) { setError(t.waiverErrAgree); return }
    if (!fullName.trim()) { setError(t.waiverErrName); return }
    if (!emergencyName.trim() || !emergencyPhone.trim()) { setError(t.waiverErrEmergency); return }
    if (hasPassengers) {
      for (const p of passengers) {
        if (!p.name.trim()) { setError(t.passengerErrName); return }
        const ageNum = parseInt(p.age)
        if (!p.age.toString().trim() || isNaN(ageNum) || ageNum < 1 || ageNum > 120) { setError(t.passengerErrAge); return }
      }
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/checkin/${identifier.eventId}/waiver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: identifier.email,
          fullName,
          agreed: true,
          vehicleYear, vehicleMake, vehicleModel,
          passengers: hasPassengers ? passengers : [],
          emergencyContactName: emergencyName,
          emergencyContactPhone: emergencyPhone,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || t.genericError); return }
      onSaved(d.waiver)
    } catch {
      setError(t.networkError)
    } finally {
      setSubmitting(false)
    }
  }

  if (waiver) {
    return (
      <SectionCard title={t.waiverTitle} done delay={90} doneLabel={t.waiverDoneLabel} pendingLabel={t.waiverPendingLabel}>
        <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.8 }}>
          <div style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontSize: '28px', color: '#1a1a1a', marginBottom: '0.5rem' }}>
            {waiver.full_name}
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            {t.signedByOn} {new Date(waiver.signed_at).toLocaleDateString(checkinDateLocale(lang), { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' })}.
          </div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>{t.waiverLockedNote}</div>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title={t.waiverTitle} done={false} delay={90} doneLabel={t.waiverDoneLabel} pendingLabel={t.waiverPendingLabel}>
      <div className="wtetci-card" style={{ maxHeight: '260px', overflowY: 'auto', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1rem 1.1rem', background: '#fafaf8', fontSize: '12px', color: '#555', lineHeight: 1.75, whiteSpace: 'pre-wrap', marginBottom: '1.25rem' }}>
        {waiverText}
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', fontSize: '13px', color: '#333', lineHeight: 1.6 }}>
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: '3px', width: '15px', height: '15px', flexShrink: 0, accentColor: '#45643c' }} />
          {t.agreeLabel}
        </label>

        <div>
          <label style={label}>{t.signatureLabel}</label>
          <input
            type="text"
            className="wtetci-input"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder={t.signaturePlaceholder}
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
          <div style={{ fontSize: '10px', color: '#bbb', marginTop: '0.3rem' }}>{t.signatureHint}</div>
        </div>

        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.6rem' }}>{t.vehicleHeader}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
            <div><label style={label}>{t.yearLabel}</label><input type="text" className="wtetci-input" value={vehicleYear} onChange={e => setVehicleYear(e.target.value)} style={inp} /></div>
            <div><label style={label}>{t.makeLabel}</label><input type="text" className="wtetci-input" value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} style={inp} /></div>
            <div><label style={label}>{t.modelLabel}</label><input type="text" className="wtetci-input" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} style={inp} /></div>
          </div>
        </div>

        {maxExtra > 0 && (
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '12px', color: '#666', marginBottom: '0.35rem' }}>
              <input type="checkbox" checked={hasPassengers} onChange={e => { setHasPassengers(e.target.checked); if (e.target.checked && passengers.length === 0) setPassengers([emptyPassenger()]) }} style={{ width: '14px', height: '14px', accentColor: '#45643c' }} />
              {t.bringingPassengers}
            </label>
            <p style={{ fontSize: '11px', color: '#aaa', lineHeight: 1.6, margin: hasPassengers ? '0 0 0.75rem' : 0 }}>{t.bringingPassengersHint}</p>
            {hasPassengers && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} className="wtetci-fade-in">
                {passengers.map((p, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 24px', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="text" className="wtetci-input" value={p.name} onChange={e => updatePassenger(i, 'name', e.target.value)} placeholder={t.passengerNamePlaceholder} style={inp} />
                    <input type="number" min="1" max="120" className="wtetci-input" value={p.age} onChange={e => updatePassenger(i, 'age', e.target.value)} placeholder={t.agePlaceholder} style={inp} />
                    <button type="button" onClick={() => removePassenger(i)} className="wtetci-btn-ghost" style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
                  </div>
                ))}
                {passengers.length >= maxExtra ? (
                  <p style={{ fontSize: '12px', color: '#8A6535', margin: '0.25rem 0 0', lineHeight: '1.6' }}>{t.maxPassengersNote(maxPassengers)}</p>
                ) : (
                  <button type="button" onClick={addPassenger} className="wtetci-btn-ghost" style={{ alignSelf: 'flex-start', background: 'none', border: '0.5px solid rgba(0,0,0,0.18)', padding: '0.4rem 0.85rem', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', cursor: 'pointer' }}>{t.addPassengerBtn}</button>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.6rem' }}>{t.emergencyHeader}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            <div><label style={label}>{t.nameLabel}</label><input type="text" className="wtetci-input" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} style={inp} /></div>
            <div><label style={label}>{t.phoneLabel}</label><input type="tel" className="wtetci-input" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder={t.phonePlaceholder} style={inp} /></div>
          </div>
        </div>

        {error && <div className="wtetci-fade-in" style={{ fontSize: '13px', color: '#93333E', padding: '0.7rem 0.9rem', background: 'rgba(147,51,62,0.05)', border: '0.5px solid rgba(147,51,62,0.2)' }}>{error}</div>}

        <button type="submit" disabled={submitting} className="wtetci-btn-primary" style={{ alignSelf: 'flex-start', padding: '0.85rem 1.75rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? t.signingBtn : t.signWaiverBtn}
        </button>
      </form>
    </SectionCard>
  )
}
