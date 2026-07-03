'use client'
import { useState } from 'react'
import SectionCard from './WtetSectionCard'
import { WTET_CHECKIN_T, wtetDateLocale } from '../lib/wtetCheckinI18n'

// identifier: { email } or { token }
export default function WtetLunchSection({ identifier, lunch, lunchOptions, lunchCutoff, lunchLocked, lang = 'en', onSaved }) {
  const t = WTET_CHECKIN_T[lang] || WTET_CHECKIN_T.en
  const [dishId, setDishId] = useState(lunch?.dish_id || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(!lunch)

  const cutoffDate = new Date(lunchCutoff)
  const cutoffStr = cutoffDate.toLocaleDateString(wtetDateLocale(lang), { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!dishId) { setError(t.lunchErrDish); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/wtet-registration/lunch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...identifier, dishId }),
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

  if (lunch && !editing) {
    return (
      <SectionCard title={t.lunchTitle} done doneLabel={t.lunchDoneLabel} pendingLabel={t.lunchPendingLabel}>
        <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.8 }}>
          <div style={{ marginBottom: '0.5rem' }}>{t.lunchSelectedPre} <strong style={{ color: '#1a1a1a' }}>{lunch.dish_name}</strong>{t.lunchSelectedPost}</div>
          {lunchLocked ? (
            <div style={{ fontSize: '12px', color: '#aaa' }}>{t.lunchLockedNote}</div>
          ) : (
            <>
              <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '0.75rem' }}>{t.lunchChangeUntil(cutoffStr)}</div>
              <button onClick={() => setEditing(true)} style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.18)', padding: '0.5rem 1.1rem', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#666', cursor: 'pointer' }}>{t.changeSelectionBtn}</button>
            </>
          )}
        </div>
      </SectionCard>
    )
  }

  if (lunchLocked && !lunch) {
    return (
      <SectionCard title={t.lunchTitle} done={false} doneLabel={t.lunchDoneLabel} pendingLabel={t.lunchDeadlinePassedLabel}>
        <div style={{ fontSize: '13px', color: '#7B2032', lineHeight: 1.8 }}>
          {t.lunchDeadlinePassedBody(cutoffStr)}{' '}
          <a href="mailto:jerry@canvasroutes.com" style={{ color: '#7B2032', textDecoration: 'underline' }}>jerry@canvasroutes.com</a> {t.lunchDeadlinePassedBody2}
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title={t.lunchTitle} done={false} doneLabel={t.lunchDoneLabel} pendingLabel={t.lunchPendingLabel}>
      <p style={{ fontSize: '12px', color: '#999', marginBottom: '1.1rem' }}>{t.chooseOneUntil(cutoffStr)}</p>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {lunchOptions.map(dish => (
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
            {submitting ? t.savingBtn : t.saveSelectionBtn}
          </button>
          {lunch && (
            <button type="button" onClick={() => { setEditing(false); setError(null) }} style={{ padding: '0.85rem 1.5rem', background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', cursor: 'pointer' }}>{t.cancelBtn}</button>
          )}
        </div>
      </form>
    </SectionCard>
  )
}
