'use client'
import { useState, useMemo } from 'react'
import { inp, CopyBtn, Pagination } from '../_components/shared'
import { MONTREAL_TZ } from '../../../lib/mtlTime'

const EVENT_META = {
  'email.sent':             { label: 'Sent',      color: '#888',    bg: 'rgba(0,0,0,0.04)' },
  'email.delivered':        { label: 'Delivered', color: '#3B6B2F', bg: 'rgba(59,107,47,0.1)' },
  'email.delivery_delayed': { label: 'Delayed',   color: '#8A6535', bg: 'rgba(197,168,130,0.15)' },
  'email.bounced':          { label: 'Bounced',   color: '#93333E', bg: 'rgba(147,51,62,0.1)' },
  'email.complained':       { label: 'Complaint', color: '#93333E', bg: 'rgba(147,51,62,0.1)' },
  'email.opened':           { label: 'Opened',    color: '#4FA3A5', bg: 'rgba(79,163,165,0.1)' },
  'email.clicked':          { label: 'Clicked',   color: '#4FA3A5', bg: 'rgba(79,163,165,0.1)' },
}
const PROBLEM_TYPES = new Set(['email.bounced', 'email.complained'])
const PAGE_SIZE = 40

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: MONTREAL_TZ })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: MONTREAL_TZ }).toLowerCase()
  return `${date} · ${time}`
}

export default function EmailActivityClient({ events, counts, configured, loadError }) {
  const [search, setSearch] = useState('')
  const [problemsOnly, setProblemsOnly] = useState(false)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return events.filter(e => {
      if (problemsOnly && !PROBLEM_TYPES.has(e.event_type)) return false
      if (!q) return true
      return (e.recipient || '').toLowerCase().includes(q)
        || (e.subject || '').toLowerCase().includes(q)
        || (e.resend_message_id || '').toLowerCase().includes(q)
    })
  }, [events, search, problemsOnly])

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const problemCount = (counts['email.bounced'] || 0) + (counts['email.complained'] || 0)

  return (
    <div style={{ padding: '1.5rem clamp(1rem,3vw,2rem) 3rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.9rem', fontWeight: '300', color: '#1a1a1a', margin: 0 }}>Email Activity</h1>
        <p style={{ fontSize: '13px', color: '#888', marginTop: '0.35rem' }}>Delivery, bounce, and complaint events from Resend — last 500 events.</p>
      </div>

      {!configured && (
        <div style={{ padding: '0.9rem 1.1rem', background: 'rgba(197,168,130,0.12)', border: '0.5px solid rgba(197,168,130,0.4)', borderRadius: '10px', fontSize: '13px', color: '#8A6535', marginBottom: '1.25rem' }}>
          No webhook configured yet — add an endpoint at <code>https://canvasroutes.com/api/webhooks/resend</code> in the Resend dashboard (Settings → Webhooks) and set <code>RESEND_WEBHOOK_SECRET</code> in Vercel to start collecting events.
        </div>
      )}
      {loadError && (
        <div style={{ padding: '0.9rem 1.1rem', background: 'rgba(147,51,62,0.08)', border: '0.5px solid rgba(147,51,62,0.3)', borderRadius: '10px', fontSize: '13px', color: '#93333E', marginBottom: '1.25rem' }}>
          Couldn't load events — the email_events table may not exist yet (run the pending migration).
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {Object.entries(EVENT_META).map(([type, meta]) => (
          <div key={type} style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: '99px', background: meta.bg, color: meta.color, border: `0.5px solid ${meta.color}33` }}>
            {meta.label} <strong>{counts[type] || 0}</strong>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <input style={{ ...inp, maxWidth: '320px' }} placeholder="Search recipient, subject, or message id…"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '12px', color: '#555', cursor: 'pointer' }}>
          <input type="checkbox" checked={problemsOnly} onChange={e => { setProblemsOnly(e.target.checked); setPage(1) }} />
          Problems only ({problemCount})
        </label>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: '#f7f7f5', textAlign: 'left' }}>
                {['Time', 'Event', 'Recipient', 'Subject', 'Message ID'].map(h => (
                  <th key={h} style={{ padding: '0.7rem 1rem', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', fontWeight: '500', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '2rem 1rem', textAlign: 'center', color: '#bbb' }}>No events{search || problemsOnly ? ' match this filter' : ' yet'}.</td></tr>
              )}
              {pageRows.map(e => {
                const meta = EVENT_META[e.event_type] || { label: e.event_type, color: '#888', bg: 'rgba(0,0,0,0.04)' }
                return (
                  <tr key={e.id} style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: '0.65rem 1rem', color: '#888', whiteSpace: 'nowrap' }}>{fmtDate(e.occurred_at)}</td>
                    <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: '99px', background: meta.bg, color: meta.color }}>{meta.label}</span>
                      {e.bounce_type && <span style={{ marginLeft: '0.4rem', color: '#aaa', fontSize: '11px' }}>{e.bounce_type}</span>}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', color: '#333', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.recipient || '—'}</td>
                    <td style={{ padding: '0.65rem 1rem', color: '#666', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject || '—'}</td>
                    <td style={{ padding: '0.65rem 1rem', color: '#bbb', whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{(e.resend_message_id || '').slice(0, 8)}…</span>
                      <CopyBtn value={e.resend_message_id} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </div>
  )
}
