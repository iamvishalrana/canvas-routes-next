'use client'
import { useState } from 'react'
import SectionCard from './WtetSectionCard'
import { WTET_CHECKIN_T, wtetDateLocale } from '../lib/wtetCheckinI18n'

function LunchNote({ t }) {
  return (
    <div style={{ fontSize: '11.5px', color: '#999', lineHeight: 1.75, marginBottom: '1.25rem' }}>
      <p style={{ margin: 0 }}>{t.lunchWhyNote}</p>
      <p style={{ margin: '0.5rem 0 0' }}>{t.lunchDrinksNote}</p>
    </div>
  )
}

// identifier: { email } or { token }
// passengersList: [{ name, age }] from Trip Details (driver first) — lunch is
// per-person and depends on Trip Details being completed first.
export default function WtetLunchSection({ identifier, lunch, lunchOptions, lunchCutoff, lunchLocked, passengersList, tripDone, lang = 'en', onSaved }) {
  const t = WTET_CHECKIN_T[lang] || WTET_CHECKIN_T.en
  const isDone = Array.isArray(lunch) && lunch.length > 0 && lunch.length === passengersList.length
  const [dishChoices, setDishChoices] = useState(() =>
    passengersList.map((_, i) => lunch?.[i]?.dish_id || '')
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(!isDone)

  const cutoffDate = new Date(lunchCutoff)
  const cutoffStr = cutoffDate.toLocaleDateString(wtetDateLocale(lang), { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  function setChoice(i, dishId) {
    setDishChoices(prev => prev.map((d, idx) => idx === i ? dishId : d))
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (dishChoices.some(d => !d)) { setError(t.lunchErrDish); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/wtet-registration/lunch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...identifier, dishIds: dishChoices }),
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
        <LunchNote t={t} />
        <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.8 }}>
          {lunch.map((entry, i) => (
            <div key={i} style={{ marginBottom: '0.35rem' }}>
              <strong style={{ color: '#1a1a1a' }}>{entry.name || (i === 0 ? t.driverLabel : t.passengerLabel(i + 1))}</strong>
              {t.lunchSelectedPost} {entry.dish_name}
            </div>
          ))}
          {lunchLocked ? (
            <div style={{ fontSize: '12px', color: '#aaa', marginTop: '0.5rem' }}>{t.lunchLockedNote}</div>
          ) : (
            <>
              <div style={{ fontSize: '12px', color: '#aaa', margin: '0.5rem 0 0.75rem' }}>{t.lunchChangeUntil(cutoffStr)}</div>
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
        <div style={{ fontSize: '13px', color: '#7B2032', lineHeight: 1.8 }}>
          {t.lunchDeadlinePassedBody(cutoffStr)}{' '}
          <a href="mailto:jerry@canvasroutes.com" style={{ color: '#7B2032', textDecoration: 'underline' }}>jerry@canvasroutes.com</a> {t.lunchDeadlinePassedBody2}
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title={t.lunchTitle} done={false} delay={180} doneLabel={t.lunchDoneLabel} pendingLabel={t.lunchPendingLabel}>
      <LunchNote t={t} />
      <p style={{ fontSize: '12px', color: '#999', marginBottom: '0.35rem' }}>{t.chooseOneUntil(cutoffStr)}</p>
      <p style={{ fontSize: '12px', color: '#8A6535', fontWeight: '500', marginBottom: '1.25rem' }}>{t.lunchAllRequired}</p>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {passengersList.map((p, i) => (
            <div key={i} className="wtetci-card" style={{ border: '0.5px solid rgba(197,168,130,0.3)', background: '#fdfcfb', padding: '1.1rem' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.85rem' }}>
                {t.lunchForPerson(p.name || (i === 0 ? t.driverLabel : t.passengerLabel(i + 1)), i === 0)} <span style={{ color: '#7B2032' }}>*</span>
              </div>
              <div style={{ display: 'grid', gap: '0.6rem' }}>
                {lunchOptions.map(dish => (
                  <label key={dish.id} className={`wtetci-dish${dishChoices[i] === dish.id ? ' wtetci-dish-selected' : ''}`} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.85rem 0.9rem', border: `0.5px solid ${dishChoices[i] === dish.id ? 'rgba(197,168,130,0.6)' : 'rgba(0,0,0,0.1)'}`, background: dishChoices[i] === dish.id ? 'rgba(197,168,130,0.08)' : '#fff', cursor: 'pointer' }}>
                    <input type="radio" name={`dish-${i}`} value={dish.id} checked={dishChoices[i] === dish.id} onChange={() => setChoice(i, dish.id)} style={{ marginTop: '3px', width: '15px', height: '15px', flexShrink: 0, accentColor: '#45643c' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.2rem', lineHeight: 1.4 }}>{dish.name}</div>
                      <div style={{ fontSize: '11.5px', color: '#888', lineHeight: 1.6 }}>{dish.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        {error && <div className="wtetci-fade-in" style={{ fontSize: '13px', color: '#7B2032', padding: '0.7rem 0.9rem', background: 'rgba(123,32,50,0.05)', border: '0.5px solid rgba(123,32,50,0.2)' }}>{error}</div>}
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
