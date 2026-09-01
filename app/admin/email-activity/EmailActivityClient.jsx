'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { inp, CopyBtn, Pagination, FilterMenu, DateRangeMenu, CountUp, KebabMenu } from '../_components/shared'
import { ExportButton } from '../_components/ExportModal'
import { MONTREAL_TZ } from '../../../lib/mtlTime'
import { broadcastPhase } from '../../../lib/broadcastPhase'

const EVENT_META = {
  'email.sent':             { label: 'Sent',       color: '#888',    bg: 'rgba(0,0,0,0.04)' },
  'email.scheduled':        { label: 'Scheduled',  color: '#8A6535', bg: 'rgba(197,168,130,0.15)' },
  'email.delivered':        { label: 'Delivered',  color: '#3B6B2F', bg: 'rgba(59,107,47,0.1)' },
  'email.delivery_delayed': { label: 'Delayed',    color: '#8A6535', bg: 'rgba(197,168,130,0.15)' },
  'email.bounced':          { label: 'Bounced',    color: '#93333E', bg: 'rgba(147,51,62,0.1)' },
  'email.complained':       { label: 'Complaint',  color: '#93333E', bg: 'rgba(147,51,62,0.1)' },
  'email.failed':           { label: 'Failed',     color: '#93333E', bg: 'rgba(147,51,62,0.1)' },
  'email.suppressed':       { label: 'Suppressed', color: '#93333E', bg: 'rgba(147,51,62,0.1)' },
  'email.opened':           { label: 'Opened',     color: '#4FA3A5', bg: 'rgba(79,163,165,0.1)' },
  'email.clicked':          { label: 'Clicked',    color: '#4FA3A5', bg: 'rgba(79,163,165,0.1)' },
}
const PROBLEM_TYPES = new Set(['email.bounced', 'email.complained', 'email.failed', 'email.suppressed'])
const PAGE_SIZE = 40

const TYPE_FILTER_OPTIONS = [
  { id: 'all',      label: 'All Events' },
  { id: 'problems', label: 'Problems Only' },
  ...Object.entries(EVENT_META).map(([type, meta]) => ({ id: type, label: meta.label })),
]

// A broadcast send is one row here (aggregate counts), not one row per
// recipient event — this filter lets an admin isolate just those aggregate
// rows, or just the individual transactional sends, from the merged feed.
const SOURCE_FILTER_OPTIONS = [
  { id: 'all',           label: 'All Sources' },
  { id: 'broadcast',     label: 'Broadcasts Only' },
  { id: 'scheduled',     label: 'Scheduled Only' },
  { id: 'transactional', label: 'Transactional Only' },
]

const AUDIENCE_LABELS = {
  canvas_routes_member: 'Canvas Routes Member',
  inner_circle:         'Inner Circle',
  all_active_members:   'All Active Members',
  pending_members:      'Pending Applications',
  all_contacts:         'All Contacts',
  contacts_non_members: 'Contacts (Non-Members)',
  everyone:             'Everyone',
  specific_emails:      'Specific Emails',
}

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

function audienceLabel(b) {
  return b.audience === 'specific_emails' ? `${b.specific_emails?.length ?? 0} emails` : AUDIENCE_LABELS[b.audience] || b.audience
}

const PHASE_META = {
  scheduled: { label: 'Scheduled', color: '#8A6535', bg: 'rgba(197,168,130,0.15)' },
  canceled:  { label: 'Canceled',  color: '#999',    bg: 'rgba(0,0,0,0.05)' },
  sent:      { label: 'Broadcast', color: '#8A6535', bg: 'rgba(197,168,130,0.12)' },
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

const DOMAIN_STATUS_META = {
  verified:            { label: 'Verified',    color: '#3B6B2F', bg: 'rgba(59,107,47,0.1)' },
  pending:             { label: 'Pending',     color: '#8A6535', bg: 'rgba(197,168,130,0.15)' },
  not_started:         { label: 'Not Started', color: '#93333E', bg: 'rgba(147,51,62,0.1)' },
  failed:              { label: 'Failed',      color: '#93333E', bg: 'rgba(147,51,62,0.1)' },
  temporary_failure:   { label: 'Temp. Failure', color: '#93333E', bg: 'rgba(147,51,62,0.1)' },
}

// Domain/DNS verification straight from Resend — this is a separate signal
// from email_events (which only shows what already happened to sends). A
// domain that quietly drops from "verified" (a DNS record got removed,
// registrar migration, etc.) explains a bounce spike before it even shows up
// as one. Collapsed to a one-line pill when everything's fine; expands to
// the individual SPF/DKIM/DMARC record statuses when something isn't.
function DomainHealthCard({ domains, loading, error }) {
  if (loading) return null // avoid a layout flash while this loads in the background
  if (error) {
    return (
      <div style={{ padding: '0.75rem 1rem', background: 'rgba(147,51,62,0.06)', border: '0.5px solid rgba(147,51,62,0.2)', borderRadius: '10px', fontSize: '12px', color: '#93333E', marginBottom: '1.1rem' }}>
        Couldn't check domain health — {error}
      </div>
    )
  }
  if (!domains || domains.length === 0) return null

  return (
    <div style={{ ...CARD, padding: '0.85rem 1.1rem', marginBottom: '1.1rem' }}>
      <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginBottom: '0.6rem' }}>Domain Health</div>
      {domains.map(d => {
        const meta = DOMAIN_STATUS_META[d.status] || { label: d.status, color: '#888', bg: 'rgba(0,0,0,0.04)' }
        const allVerified = d.status === 'verified'
        return (
          <div key={d.id} style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12.5px', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif' }}>{d.name}</span>
              <span style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '99px', background: meta.bg, color: meta.color }}>{meta.label}</span>
            </div>
            {!allVerified && d.records?.length > 0 && (
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {d.records.map((r, i) => {
                  const rMeta = DOMAIN_STATUS_META[r.status] || { label: r.status, color: '#888', bg: 'rgba(0,0,0,0.04)' }
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '11px', color: '#666', flexWrap: 'wrap' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: rMeta.color, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'monospace', fontSize: '10.5px' }}>{r.record}{r.type ? ` (${r.type})` : ''}</span>
                      <span style={{ color: rMeta.color }}>{rMeta.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function EmailActivityClient({
  events, counts, configured, loadError, fetchedAt,
  broadcasts = [], broadcastsLoading, broadcastsError,
  onViewDelivery, onReuseBroadcast, onRetryFailedBroadcast, onDeleteBroadcast, onCancelScheduled,
}) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [timelineRecipient, setTimelineRecipient] = useState(null)
  const [domains, setDomains] = useState(null)
  const [domainsLoading, setDomainsLoading] = useState(true)
  const [domainsError, setDomainsError] = useState(null)

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Domain/DNS verification health — fetched once on mount, separate from
  // the email_events data (a different Resend API surface entirely).
  useEffect(() => {
    fetch('/api/admin/resend-domains')
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) { setDomainsError(d.error || 'Failed to load.'); return }
        setDomains(d.domains || [])
      })
      .catch(() => setDomainsError('Network error.'))
      .finally(() => setDomainsLoading(false))
  }, [])

  // router.refresh() re-runs the server component's fetch (revalidate=30
  // means data can be up to 30s stale) — this lets an admin pull the latest
  // events without a full page reload.
  function refresh() {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 600)
  }

  // Merge broadcast sends into ONE row each (using the broadcasts table's own
  // aggregate counts) instead of showing every one of their underlying
  // per-recipient email_events rows individually — otherwise a 50-recipient
  // broadcast shows up as 50+ near-duplicate rows here on top of its own
  // summary. Transactional (non-broadcast) emails still show one row per event,
  // same as before, since they have no higher-level grouping to collapse into.
  const mergedRows = useMemo(() => {
    const byBroadcastId = new Map(broadcasts.map(b => [b.id, b]))
    const seen = new Set()
    const rows = []
    for (const e of events) {
      if (e.broadcast_id) {
        const b = byBroadcastId.get(e.broadcast_id)
        if (b) {
          if (seen.has(e.broadcast_id)) continue
          seen.add(e.broadcast_id)
          rows.push({ kind: 'broadcast', id: `b-${b.id}`, broadcast: b, ts: b.sent_at })
          continue
        }
        // Tagged with a broadcast_id but no matching row in `broadcasts` (its
        // history entry was deleted, or broadcasts hasn't loaded yet) — fall
        // through and show it as a plain event rather than dropping it.
      }
      rows.push({ kind: 'event', id: e.id, event: e, ts: e.occurred_at })
    }
    // A broadcast just sent may have no email_events row yet (Resend's
    // webhook lands async) — without this it would be invisible until the
    // first delivery event arrives. Add any broadcast not already shown.
    for (const b of broadcasts) {
      if (!seen.has(b.id)) { rows.push({ kind: 'broadcast', id: `b-${b.id}`, broadcast: b, ts: b.sent_at }); seen.add(b.id) }
    }
    rows.sort((a, b) => new Date(b.ts) - new Date(a.ts))
    return rows
  }, [events, broadcasts])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null
    return mergedRows.filter(row => {
      if (sourceFilter === 'broadcast' && row.kind !== 'broadcast') return false
      if (sourceFilter === 'transactional' && row.kind !== 'event') return false
      if (sourceFilter === 'scheduled' && (row.kind !== 'broadcast' || broadcastPhase(row.broadcast) !== 'scheduled')) return false
      // A broadcast row aggregates many recipients' event types at once, so
      // it only makes sense to show it under "All Events" — a specific type
      // filter (e.g. Bounced) narrows to individual events, not summaries.
      if (typeFilter !== 'all' && row.kind === 'broadcast') return false
      if (row.kind === 'event') {
        const e = row.event
        if (typeFilter === 'problems') { if (!PROBLEM_TYPES.has(e.event_type)) return false }
        else if (typeFilter !== 'all' && e.event_type !== typeFilter) return false
      }
      if (fromTs || toTs) {
        const ts = row.ts ? new Date(row.ts).getTime() : null
        if (!ts || (fromTs && ts < fromTs) || (toTs && ts > toTs)) return false
      }
      if (!q) return true
      if (row.kind === 'broadcast') return (row.broadcast.subject || '').toLowerCase().includes(q)
      const e = row.event
      return (e.recipient || '').toLowerCase().includes(q)
        || (e.subject || '').toLowerCase().includes(q)
        || (e.resend_message_id || '').toLowerCase().includes(q)
    })
  }, [mergedRows, search, typeFilter, sourceFilter, dateFrom, dateTo])

  useEffect(() => { setPage(1) }, [search, typeFilter, sourceFilter, dateFrom, dateTo])

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

  const exportRows = filtered.map(row => {
    if (row.kind === 'broadcast') {
      const b = row.broadcast
      const phase = broadcastPhase(b)
      const summary = phase === 'canceled'
        ? `Canceled — was scheduled for ${fmtDate(b.sent_at)}`
        : `${b.sent_count} ${phase === 'scheduled' ? 'queued' : 'sent'}${b.failed_count ? `, ${b.failed_count} failed` : ''}`
      return [fmtDate(b.sent_at), PHASE_META[phase].label, summary, b.subject || '', '', '']
    }
    const e = row.event
    return [fmtDate(e.occurred_at), EVENT_META[e.event_type]?.label || e.event_type, e.recipient || '', e.subject || '', e.bounce_type || '', e.resend_message_id || '']
  })

  function broadcastKebabItems(b) {
    const phase = broadcastPhase(b)
    return [
      phase === 'scheduled' ? { label: 'Cancel', danger: true, onClick: () => onCancelScheduled(b) } : null,
      { label: 'View Delivery', onClick: () => onViewDelivery(b) },
      { label: 'Re-use', onClick: () => onReuseBroadcast(b) },
      b.failed_recipients?.length > 0 ? { label: 'Retry Failed', onClick: () => onRetryFailedBroadcast(b) } : null,
      // A still-scheduled broadcast can't be deleted directly — its history
      // row is what makes canceling possible at all. Must cancel first.
      phase !== 'scheduled' ? { label: 'Delete', danger: true, onClick: () => onDeleteBroadcast(b) } : null,
    ]
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Delivery, bounce, and complaint events from Resend — last 500 events, plus every broadcast ever sent.</p>
        <button onClick={refresh} disabled={refreshing} title="Reload the latest events"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem', minHeight: '36px', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', cursor: refreshing ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s' }}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
          {refreshing ? 'Refreshing…' : 'Refresh'}
          {fetchedAt && !refreshing && <span style={{ color: '#bbb', marginLeft: '2px' }}>· as of {fmtAsOf(fetchedAt)}</span>}
        </button>
      </div>

      <DomainHealthCard domains={domains} loading={domainsLoading} error={domainsError} />

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
      {broadcastsError && (
        <div style={{ padding: '0.9rem 1.1rem', background: 'rgba(147,51,62,0.08)', border: '0.5px solid rgba(147,51,62,0.3)', borderRadius: '10px', fontSize: '13px', color: '#93333E', marginBottom: '1.25rem' }}>
          Couldn't load broadcast history — {broadcastsError}
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

      <style>{`
        @keyframes ea-pill-in { from { opacity: 0; transform: translateY(4px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .ea-pill { animation: ea-pill-in 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        @media (hover: hover) {
          .ea-pill:hover { transform: translateY(-1px) scale(1.04); }
        }
        .ea-pill:active { transform: scale(0.96); }
        @media (prefers-reduced-motion: reduce) {
          .ea-pill { animation: none; }
          .ea-pill:hover, .ea-pill:active { transform: none; }
        }
      `}</style>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
        {Object.entries(EVENT_META).map(([type, meta], i) => {
          const active = typeFilter === type
          return (
            <button
              key={type}
              type="button"
              className="ea-pill"
              onClick={() => setTypeFilter(f => f === type ? 'all' : type)}
              title={active ? 'Click to clear this filter' : `Show only ${meta.label} events`}
              style={{
                fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 12px',
                borderRadius: '99px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif',
                background: active ? meta.color : meta.bg,
                color: active ? '#fff' : meta.color,
                border: `0.5px solid ${active ? meta.color : `${meta.color}33`}`,
                boxShadow: active ? `0 3px 12px ${meta.color}55` : 'none',
                transition: 'background 0.18s ease, color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
                animationDelay: `${i * 40}ms`,
              }}
            >
              {meta.label} <strong><CountUp value={counts[type] || 0} /></strong>
            </button>
          )
        })}
        {typeFilter !== 'all' && (
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className="ea-pill"
            style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: '99px', cursor: 'pointer', background: 'transparent', color: '#aaa', border: '0.5px solid rgba(0,0,0,0.15)', fontFamily: 'var(--font-inter),sans-serif' }}
          >
            Clear filter ×
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <input style={{ ...inp, maxWidth: '280px', flex: '1 1 200px' }} placeholder="Search recipient, subject, or message id…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <FilterMenu options={TYPE_FILTER_OPTIONS} value={typeFilter} onChange={setTypeFilter} />
        <FilterMenu options={SOURCE_FILTER_OPTIONS} value={sourceFilter} onChange={setSourceFilter} />
        <DateRangeMenu label="Date range" from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        {filtered.length > 0 && (
          <ExportButton filename="email-activity" title="Email Activity" headers={['Time', 'Event', 'Recipient', 'Subject', 'Bounce Type', 'Message ID']} rows={exportRows} />
        )}
        <span style={{ fontSize: '11px', color: '#bbb', marginLeft: 'auto', fontFamily: 'var(--font-inter),sans-serif' }}>{filtered.length} of {mergedRows.length}{problemCount > 0 ? ` · ${problemCount} problem${problemCount !== 1 ? 's' : ''}` : ''}{broadcastsLoading ? ' · loading broadcasts…' : ''}</span>
      </div>

      {isMobile ? (
        <div>
          {pageRows.length === 0 && (
            <div style={{ ...CARD, textAlign: 'center', color: '#bbb', fontSize: '13px' }}>No events{search || typeFilter !== 'all' || sourceFilter !== 'all' || dateFrom || dateTo ? ' match this filter' : ' yet'}.</div>
          )}
          {pageRows.map(row => {
            if (row.kind === 'broadcast') {
              const b = row.broadcast
              const phase = broadcastPhase(b)
              const meta = PHASE_META[phase]
              return (
                <div key={row.id} style={{ ...CARD, marginBottom: '0.5rem', padding: '0.9rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', gap: '0.5rem' }}>
                    <span style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: '99px', background: meta.bg, color: meta.color, flexShrink: 0 }}>{meta.label}</span>
                    <span style={{ fontSize: '11px', color: '#aaa', whiteSpace: 'nowrap' }}>{fmtDate(b.sent_at)}</span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#333', marginBottom: '0.3rem' }}>{b.subject}</div>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '0.5rem' }}>
                    {phase === 'canceled' ? (
                      <>Canceled · was scheduled for {fmtDate(b.sent_at)}</>
                    ) : (
                      <>
                        <span style={{ color: '#3B6B2F' }}>{b.sent_count} {phase === 'scheduled' ? 'queued' : 'sent'}</span>
                        {b.failed_count > 0 && <span style={{ color: '#93333E' }}> · {b.failed_count} {phase === 'scheduled' ? 'failed to queue' : 'failed'}</span>}
                        {' · '}{audienceLabel(b)}
                      </>
                    )}
                  </div>
                  <KebabMenu items={broadcastKebabItems(b)} />
                </div>
              )
            }
            const e = row.event
            const meta = EVENT_META[e.event_type] || { label: e.event_type, color: '#888', bg: 'rgba(0,0,0,0.04)' }
            return (
              <div key={row.id} style={{ ...CARD, marginBottom: '0.5rem', padding: '0.9rem 1rem' }}>
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
                  <tr><td colSpan={6} style={{ padding: '2rem 1rem', textAlign: 'center', color: '#bbb' }}>No events{search || typeFilter !== 'all' || sourceFilter !== 'all' || dateFrom || dateTo ? ' match this filter' : ' yet'}.</td></tr>
                )}
                {pageRows.map(row => {
                  if (row.kind === 'broadcast') {
                    const b = row.broadcast
                    const phase = broadcastPhase(b)
                    const meta = PHASE_META[phase]
                    return (
                      <tr key={row.id} style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                        <td style={{ padding: '0.65rem 1rem', color: '#888', whiteSpace: 'nowrap' }}>{fmtDate(b.sent_at)}</td>
                        <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: '99px', background: meta.bg, color: meta.color }}>{meta.label}</span>
                        </td>
                        <td style={{ padding: '0.65rem 1rem', color: '#333', whiteSpace: 'nowrap' }}>
                          {phase === 'canceled' ? (
                            <span style={{ color: '#999' }}>was for {fmtDate(b.sent_at)}</span>
                          ) : (
                            <>
                              <span style={{ color: '#3B6B2F' }}>{b.sent_count} {phase === 'scheduled' ? 'queued' : 'sent'}</span>
                              {b.failed_count > 0 && <span style={{ color: '#93333E' }}> · {b.failed_count} {phase === 'scheduled' ? 'failed to queue' : 'failed'}</span>}
                            </>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 1rem', color: '#666', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.subject || '—'}</td>
                        <td style={{ padding: '0.65rem 1rem', color: '#bbb', whiteSpace: 'nowrap' }}>{audienceLabel(b)}</td>
                        <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>
                          <KebabMenu items={broadcastKebabItems(b)} />
                        </td>
                      </tr>
                    )
                  }
                  const e = row.event
                  const meta = EVENT_META[e.event_type] || { label: e.event_type, color: '#888', bg: 'rgba(0,0,0,0.04)' }
                  return (
                    <tr key={row.id} style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
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
