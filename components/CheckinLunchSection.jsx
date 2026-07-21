'use client'
import { useState } from 'react'
import SectionCard from './WtetSectionCard'
import { CHECKIN_T, checkinDateLocale } from '../lib/genericCheckinContent'
import { useLanguage } from '../lib/i18n/LanguageContext'

// identifier: { email, eventId }
// passengersList: [{ name, age }] from Trip Details (driver first) — lunch is
// per-person and depends on Trip Details being completed first. Only people
// actually entered there get a dish picker — this never pads with blanks.
export default function CheckinLunchSection({ identifier, lunch, lunchOptions, lunchIntro, lunchCutoff, lunchLocked, passengersList, tripDone, onSaved }) {
  const { lang } = useLanguage()
  const t = CHECKIN_T[lang]
  const isDone = Array.isArray(lunch) && lunch.length > 0 && lunch.length === passengersList.length
  const [dishChoices, setDishChoices] = useState(() =>
    passengersList.map((_, i) => lunch?.[i]?.dish_id || '')
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(!isDone)

  const cutoffStr = lunchCutoff
    ? new Date(lunchCutoff).toLocaleDateString(checkinDateLocale(lang), { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' })
    : null

  function setChoice(i, dishId) {
    setDishChoices(prev => prev.map((d, idx) => idx === i ? dishId : d))
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (dishChoices.some(d => !d)) { setError(t.lunchErrDish); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/checkin/${identifier.eventId}/lunch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier.email, dishIds: dishChoices }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || t.genericError); return }
      onSaved(d.lunch)
      setEditing(false)
    } catch {
      setError(t.networkError)
    } finally {
      setSubmitting(false)
    }
  }

  if (!tripDone) {
    return (
      <SectionCard title={t.lunchTitle} done={false} delay={180} doneLabel={t.lunchDoneLabel} pendingLabel={t.lunchPendingLabel}>
        <div style={{ fontSize: '13px', color: '#999', lineHeight: 1.8 }}>{t.lunchNeedsTripFirst}</div>
      </SectionCard>
    )
  }

  if (isDone && !editing) {
    return (
      <SectionCard title={t.lunchTitle} done delay={180} doneLabel={t.lunchDoneLabel} pendingLabel={t.lunchPendingLabel}>
        <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.8 }}>
          {lunchIntro && <p style={{ fontSize: '12.5px', color: '#888', lineHeight: 1.8, marginBottom: '1rem' }}>{lunchIntro}</p>}
          {lunch.map((entry, i) => (
            <div key={i} style={{ marginBottom: '0.35rem' }}>
              <strong style={{ color: '#1a1a1a' }}>{entry.name || (i === 0 ? t.driverLabel : t.passengerLabel(i + 1))}</strong>
              {t.lunchSelectedPost} {entry.dish_name}
            </div>
          ))}
          {lunchLocked ? (
            <div style={{ fontSize: '12px', color: '#888', marginTop: '0.5rem' }}>{t.lunchLockedNote}</div>
          ) : (
            <>
              {cutoffStr && <div style={{ fontSize: '12px', color: '#888', margin: '0.5rem 0 0.75rem' }}>{t.lunchChangeUntil(cutoffStr)}</div>}
              <button onClick={() => setEditing(true)} className="wtetci-btn-ghost" style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.18)', padding: '0.5rem 1.1rem', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#666', cursor: 'pointer' }}>{t.changeSelectionBtn}</button>
            </>
          )}
        </div>
      </SectionCard>
    )
  }

  if (lunchLocked && !isDone) {
    return (
      <SectionCard title={t.lunchTitle} done={false} delay={180} doneLabel={t.lunchDoneLabel} pendingLabel={t.lunchDeadlinePassedLabel}>
        <div style={{ fontSize: '13px', color: '#93333E', lineHeight: 1.8 }}>
          {t.lunchDeadlinePassedBody(cutoffStr)}{' '}
          <a href="mailto:jerry@canvasroutes.com" style={{ color: '#93333E', textDecoration: 'underline' }}>jerry@canvasroutes.com</a> {t.lunchDeadlinePassedBody2}
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title={t.lunchTitle} done={false} delay={180} doneLabel={t.lunchDoneLabel} pendingLabel={t.lunchPendingLabel}>
      {lunchIntro && <p style={{ fontSize: '12.5px', color: '#888', lineHeight: 1.8, marginBottom: '1rem' }}>{lunchIntro}</p>}
      {cutoffStr && <p style={{ fontSize: '12px', color: '#999', marginBottom: '0.35rem' }}>{t.chooseOneUntil(cutoffStr)}</p>}
      <p style={{ fontSize: '12px', color: '#8A6535', fontWeight: '500', marginBottom: '1.25rem' }}>{t.lunchAllRequired}</p>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {passengersList.map((p, i) => (
            <div key={i} className="wtetci-card" style={{ border: '0.5px solid rgba(197,168,130,0.3)', background: '#fdfcfb', padding: '1.1rem' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.85rem' }}>
                {t.lunchForPerson(p.name || (i === 0 ? t.driverLabel : t.passengerLabel(i + 1)), i === 0)} <span style={{ color: '#93333E' }}>*</span>
              </div>
              <div style={{ display: 'grid', gap: '0.6rem' }}>
                {lunchOptions.map(dish => (
                  <label key={dish.id} className={`wtetci-dish${dishChoices[i] === dish.id ? ' wtetci-dish-selected' : ''}`} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.85rem 0.9rem', border: `0.5px solid ${dishChoices[i] === dish.id ? 'rgba(197,168,130,0.6)' : 'rgba(0,0,0,0.1)'}`, background: dishChoices[i] === dish.id ? 'rgba(197,168,130,0.08)' : '#fff', cursor: 'pointer' }}>
                    <input type="radio" name={`dish-${i}`} value={dish.id} checked={dishChoices[i] === dish.id} onChange={() => setChoice(i, dish.id)} style={{ marginTop: '3px', width: '15px', height: '15px', flexShrink: 0, accentColor: '#45643c' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', marginBottom: dish.description ? '0.2rem' : 0, lineHeight: 1.4 }}>{dish.name}</div>
                      {dish.description && <div style={{ fontSize: '11.5px', color: '#888', lineHeight: 1.6 }}>{dish.description}</div>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        {error && <div className="wtetci-fade-in" style={{ fontSize: '13px', color: '#93333E', padding: '0.7rem 0.9rem', background: 'rgba(147,51,62,0.05)', border: '0.5px solid rgba(147,51,62,0.2)' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button type="submit" disabled={submitting} className="wtetci-btn-primary" style={{ padding: '0.85rem 1.75rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? t.savingBtn : t.saveSelectionBtn}
          </button>
          {isDone && (
            <button type="button" onClick={() => { setEditing(false); setError(null) }} className="wtetci-btn-ghost" style={{ padding: '0.85rem 1.5rem', background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', cursor: 'pointer' }}>{t.cancelBtn}</button>
          )}
        </div>
      </form>
    </SectionCard>
  )
}
