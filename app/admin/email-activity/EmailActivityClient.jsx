'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { inp, CopyBtn, Pagination, FilterMenu, DateRangeMenu } from '../_components/shared'
import { ExportButton } from '../_components/ExportModal'
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

const TYPE_FILTER_OPTIONS = [
  { id: 'all',      label: 'All Events' },
  { id: 'problems', label: 'Problems Only' },
  ...Object.entries(EVENT_META).map(([type, meta]) => ({ id: type, label: meta.label })),
]

const CARD = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.1rem 1.35rem' }

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: MONTREAL_TZ })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: MONTREAL_TZ }).toLowerCase()
  return `${date} · ${time}`
}

function fmtAsOf(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: MONTREAL_TZ }).toLowerCase()
}

// Timeline for one recipient — chronological, so "did they get it" reads as
// a story (sent → delivered → opened) instead of a scattered filtered table.
function RecipientTimeline({ recipient, events, onClose }) {
  const rows = useMemo(() => events
    .filter(e => e.recipient === recipient)
    .slice()
    .sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at)), [events, recipient])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,30,20,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 12px 48px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '0.25rem' }}>Delivery Timeline</div>
            <div style={{ fontSize: '13px', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif', wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>{recipient}<CopyBtn value={recipient} /></div>
          </div>
          <button onClick={onClose} aria-label="Close timeline" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '18px', lineHeight: 1, padding: '4px 8px', flexShrink: 0 }}>×</button>
        </div>
        <div style={{ padding: '1.1rem 1.25rem', overflowY: 'auto' }}>
          {rows.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#bbb', textAlign: 'center', padding: '1rem 0' }}>No events found for this address.</div>
          ) : (
            <div style={{ position: 'relative' }}>
              {rows.map((e, i) => {
                const meta = EVENT_META[e.event_type] || { label: e.event_type, color: '#888', bg: 'rgba(0,0,0,0.04)' }
                return (
                  <div key={e.id} style={{ display: 'flex', gap: '0.85rem', paddingBottom: i < rows.length - 1 ? '1.1rem' : 0, position: 'relative' }}>
                    {i < rows.length - 1 && <div style={{ position: 'absolute', left: '5px', top: '14px', bottom: 0, width: '1px', background: 'rgba(0,0,0,0.1)' }} />}
                    <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: meta.color, marginTop: '3px', flexShrink: 0, boxShadow: `0 0 0 3px ${meta.bg}` }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: '500', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif' }}>{meta.label}</span>
                        <span style={{ fontSize: '11px', color: '#aaa', fontFamily: 'var(--font-inter),sans-serif' }}>{fmtDate(e.occurred_at)}</span>
                      </div>
                      {e.subject && <div style={{ fontSize: '11.5px', color: '#888', marginTop: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>{e.subject}</div>}
                      {e.bounce_type && <div style={{ fontSize: '11px', color: '#93333E', marginTop: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>{e.bounce_type}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EmailActivityClient({ events, counts, configured, loadError, fetchedAt }) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [timelineRecipient, setTimelineRecipient] = useState(null)

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // router.refresh() re-runs the server component's fetch (revalidate=30
  // means data can be up to 30s stale) — this lets an admin pull the latest
  // events without a full page reload.
  function refresh() {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 600)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null
    return events.filter(e => {
      if (typeFilter === 'problems') { if (!PROBLEM_TYPES.has(e.event_type)) return false }
      else if (typeFilter !== 'all' && e.event_type !== typeFilter) return false
      if (fromTs || toTs) {
        const ts = e.occurred_at ? new Date(e.occurred_at).getTime() : null
        if (!ts || (fromTs && ts < fromTs) || (toTs && ts > toTs)) return false
      }
      if (!q) return true
      return (e.recipient || '').toLowerCase().includes(q)
        || (e.subject || '').toLowerCase().includes(q)
        || (e.resend_message_id || '').toLowerCase().includes(q)
    })
  }, [events, search, typeFilter, dateFrom, dateTo])

  useEffect(() => { setPage(1) }, [search, typeFilter, dateFrom, dateTo])

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const problemCount = (counts['email.bounced'] || 0) + (counts['email.complained'] || 0)

  const sentCount      = counts['email.sent'] || 0
  const deliveredCount = counts['email.delivered'] || 0
  const openedCount    = counts['email.opened'] || 0
  const bouncedCount   = counts['email.bounced'] || 0
  const uniqueRecipients = useMemo(() => new Set(events.map(e => e.recipient).filter(Boolean)).size, [events])
  const deliveryRate = sentCount ? Math.round((deliveredCount / sentCount) * 100) : null
  const bounceRate    = sentCount ? Math.round((bouncedCount / sentCount) * 100) : null
  const openRate       = deliveredCount ? Math.round((openedCount / deliveredCount) * 100) : null

  const exportRows = filtered.map(e => [
    fmtDate(e.occurred_at), EVENT_META[e.event_type]?.label || e.event_type,
    e.recipient || '', e.subject || '', e.bounce_type || '', e.resend_message_id || '',
  ])

  return (
    <div style={{ padding: '1.5rem clamp(1rem,3vw,2rem) 3rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '1.9rem', fontWeight: '300', color: '#1a1a1a', margin: 0 }}>Email Activity</h1>
          <p style={{ fontSize: '13px', color: '#888', marginTop: '0.35rem' }}>Delivery, bounce, and complaint events from Resend — last 500 events.</p>
        </div>
        <button onClick={refresh} disabled={refreshing} title="Reload the latest events"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', minHeight: '36px', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', cursor: refreshing ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s' }}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
          {refreshing ? 'Refreshing…' : 'Refresh'}
          {fetchedAt && !refreshing && <span style={{ color: '#bbb', marginLeft: '2px' }}>· as of {fmtAsOf(fetchedAt)}</span>}
        </button>
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

      {/* KPI summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem', marginBottom: '1.1rem' }}>
        {[
          { label: 'Total Events',      value: events.length,                              color: '#1a1a1a' },
          { label: 'Unique Recipients', value: uniqueRecipients,                            color: '#1a1a1a' },
          { label: 'Delivery Rate',     value: deliveryRate === null ? '—' : `${deliveryRate}%`, color: '#3B6B2F' },
          { label: 'Open Rate',         value: openRate === null ? '—' : `${openRate}%`,         color: '#4FA3A5' },
          { label: 'Bounce Rate',       value: bounceRate === null ? '—' : `${bounceRate}%`,      color: bounceRate ? '#93333E' : '#3B6B2F' },
        ].map(s => (
          <div key={s.label} style={CARD}>
            <div style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '1.7rem', fontWeight: '400', color: s.color, lineHeight: 1, letterSpacing: '0.03em' }}>{s.value}</div>
            <div style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', marginTop: '0.35rem', fontFamily: 'var(--font-inter),sans-serif' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {Object.entries(EVENT_META).map(([type, meta]) => (
          <div key={type} style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: '99px', background: meta.bg, color: meta.color, border: `0.5px solid ${meta.color}33` }}>
            {meta.label} <strong>{counts[type] || 0}</strong>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <input style={{ ...inp, maxWidth: '280px', flex: '1 1 200px' }} placeholder="Search recipient, subject, or message id…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <FilterMenu options={TYPE_FILTER_OPTIONS} value={typeFilter} onChange={setTypeFilter} />
        <DateRangeMenu label="Date range" from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        {filtered.length > 0 && (
          <ExportButton filename="email-activity" title="Email Activity" headers={['Time', 'Event', 'Recipient', 'Subject', 'Bounce Type', 'Message ID']} rows={exportRows} />
        )}
        <span style={{ fontSize: '11px', color: '#bbb', marginLeft: 'auto', fontFamily: 'var(--font-inter),sans-serif' }}>{filtered.length} of {events.length}{problemCount > 0 ? ` · ${problemCount} problem${problemCount !== 1 ? 's' : ''}` : ''}</span>
      </div>

      {isMobile ? (
        <div>
          {pageRows.length === 0 && (
            <div style={{ ...CARD, textAlign: 'center', color: '#bbb', fontSize: '13px' }}>No events{search || typeFilter !== 'all' || dateFrom || dateTo ? ' match this filter' : ' yet'}.</div>
          )}
          {pageRows.map(e => {
            const meta = EVENT_META[e.event_type] || { label: e.event_type, color: '#888', bg: 'rgba(0,0,0,0.04)' }
            return (
              <div key={e.id} style={{ ...CARD, marginBottom: '0.5rem', padding: '0.9rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', gap: '0.5rem' }}>
                  <span style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: '99px', background: meta.bg, color: meta.color, flexShrink: 0 }}>{meta.label}</span>
                  <span style={{ fontSize: '11px', color: '#aaa', whiteSpace: 'nowrap' }}>{fmtDate(e.occurred_at)}</span>
                </div>
                <div style={{ fontSize: '12.5px', color: '#333', wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: '0.15rem', marginBottom: '0.2rem' }}>{e.recipient || '—'}<CopyBtn value={e.recipient} /></div>
                {e.subject && <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.4rem' }}>{e.subject}</div>}
                {e.bounce_type && <div style={{ fontSize: '11px', color: '#93333E', marginBottom: '0.4rem' }}>{e.bounce_type}</div>}
                {e.recipient && (
                  <button onClick={() => setTimelineRecipient(e.recipient)}
                    style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', minHeight: '30px', border: '0.5px solid rgba(0,0,0,0.15)', background: 'transparent', color: '#888', cursor: 'pointer', borderRadius: '6px', fontFamily: 'var(--font-inter),sans-serif' }}>
                    View Timeline
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#f7f7f5', textAlign: 'left' }}>
                  {['Time', 'Event', 'Recipient', 'Subject', 'Message ID', ''].map(h => (
                    <th key={h} style={{ padding: '0.7rem 1rem', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', fontWeight: '500', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '2rem 1rem', textAlign: 'center', color: '#bbb' }}>No events{search || typeFilter !== 'all' || dateFrom || dateTo ? ' match this filter' : ' yet'}.</td></tr>
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
                      <td style={{ padding: '0.65rem 1rem', color: '#333', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.1rem' }}>{e.recipient || '—'}<CopyBtn value={e.recipient} /></span>
                      </td>
                      <td style={{ padding: '0.65rem 1rem', color: '#666', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject || '—'}</td>
                      <td style={{ padding: '0.65rem 1rem', color: '#bbb', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{(e.resend_message_id || '').slice(0, 8)}…</span>
                        <CopyBtn value={e.resend_message_id} />
                      </td>
                      <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>
                        {e.recipient && (
                          <button onClick={() => setTimelineRecipient(e.recipient)} title="View this recipient's full delivery timeline"
                            style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 9px', border: '0.5px solid rgba(0,0,0,0.15)', background: 'transparent', color: '#888', cursor: 'pointer', borderRadius: '6px', fontFamily: 'var(--font-inter),sans-serif' }}>
                            Timeline
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}
      {isMobile && filtered.length > PAGE_SIZE && (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
          <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}

      {timelineRecipient && (
        <RecipientTimeline recipient={timelineRecipient} events={events} onClose={() => setTimelineRecipient(null)} />
      )}
    </div>
  )
}
