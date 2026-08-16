'use client'
import { useState, useEffect } from 'react'
import { MONTREAL_TZ } from '../../../lib/mtlTime'

// Read-only history for one contact, aggregated server-side from every
// timestamped event already in the CRM (payments, registrations, emails,
// interest, application/member events). Lazy — only fetches when mounted, so
// it costs nothing until a contact row is expanded.

const KIND_META = {
  payment:      { dot: '#3B6B2F', label: 'Payment' },
  member:       { dot: '#c5a882', label: 'Member' },
  registration: { dot: '#2563a0', label: 'Registration' },
  interest:     { dot: '#8A6535', label: 'Interest' },
  application:  { dot: '#888',    label: 'Application' },
  email:        { dot: '#9a86c4', label: 'Email' },
  contact:      { dot: '#aaa',    label: 'Contact' },
}
const TONE_DOT = { good: '#3B6B2F', warn: '#93333E' }

function fmt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.toLocaleString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: MONTREAL_TZ })
}

export default function ActivityTimeline({ email }) {
  const [items, setItems] = useState(null) // null = loading, [] = loaded-empty
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!email) { setItems([]); return }
    let alive = true
    setItems(null); setError(null)
    fetch(`/api/admin/activity-timeline?email=${encodeURIComponent(email)}`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(new Error(d.error || `HTTP ${r.status}`))))
      .then(data => { if (alive) setItems(Array.isArray(data) ? data : []) })
      .catch(err => { if (alive) { setError(err.message || 'Could not load activity.'); setItems([]) } })
    return () => { alive = false }
  }, [email])

  return (
    <div style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
      <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', marginBottom: '0.75rem' }}>Activity Timeline</div>

      {items === null ? (
        <div style={{ fontSize: '12px', color: '#aaa' }}>Loading activity…</div>
      ) : error ? (
        <div style={{ fontSize: '12px', color: '#93333E' }}>{error}</div>
      ) : items.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#bbb' }}>No recorded activity yet.</div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '1rem' }}>
          {/* Vertical rail */}
          <div style={{ position: 'absolute', left: '4px', top: '4px', bottom: '4px', width: '1px', background: 'rgba(0,0,0,0.08)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {items.map(it => {
              const meta = KIND_META[it.kind] || KIND_META.contact
              const dot = TONE_DOT[it.tone] || meta.dot
              return (
                <div key={it.id} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-1rem', top: '3px', width: '9px', height: '9px', borderRadius: '50%', background: dot, border: '1.5px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.06)' }} />
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12.5px', color: '#1a1a1a', lineHeight: 1.45 }}>{it.title}</span>
                    <span style={{ fontSize: '10.5px', color: '#aaa', whiteSpace: 'nowrap', flexShrink: 0 }}>{fmt(it.ts)}</span>
                  </div>
                  {it.subtitle && (
                    <div style={{ fontSize: '11px', color: it.tone === 'warn' ? '#93333E' : '#888', marginTop: '1px' }}>{it.subtitle}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
