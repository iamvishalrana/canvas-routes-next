'use client'
import { useState, useMemo, useEffect } from 'react'
import { inp, sel } from '../_components/shared'
import { MONTREAL_TZ } from '../../../lib/mtlTime'

// Every logged action rendered as a plain sentence — new actions that aren't
// mapped yet fall back to "verb noun" from the dotted key, so nothing shows
// as raw code even before this map is updated.
const ACTION_LABELS = {
  'payment.capture':               'Captured payment',
  'payment.refund':                'Refunded payment',
  'member.invite':                 'Invited member',
  'member.delete':                 'Deleted member',
  'member.status_or_tier_change':  'Changed member status / tier',
  'broadcast.send':                'Sent broadcast',
  'promo.create':                  'Created promo code',
  'promo.edit':                    'Edited promo code',
  'promo.deactivate':              'Deactivated promo code',
  'promo.reactivate':              'Reactivated promo code',
  'expense.create':                'Added expense',
  'expense.delete':                'Deleted expense',
  'event.create':                  'Created event',
  'event.update':                  'Updated event',
  'event.delete':                  'Deleted event',
  'announcement.create':           'Posted announcement',
  'announcement.update':           'Updated announcement',
  'announcement.delete':           'Deleted announcement',
  'link.create':                   'Added link',
  'link.delete':                   'Deleted link',
  'event_awards.reset':            'Reset event awards',
  'wtet_awards.reset':             'Reset WTET awards',
}
const humanize = action => ACTION_LABELS[action] || (action || '').replace(/[._]/g, ' ')

const CATEGORY_META = {
  payment:      { label: 'Payments',      color: '#3B6B2F' },
  member:       { label: 'Members',       color: '#8A6535' },
  broadcast:    { label: 'Broadcasts',    color: '#3D6B99' },
  promo:        { label: 'Promo codes',   color: '#6B4E8E' },
  expense:      { label: 'Expenses',      color: '#93333E' },
  event:        { label: 'Events',        color: '#45643C' },
  announcement: { label: 'Announcements', color: '#c5a882' },
  link:         { label: 'Links',         color: '#4FA3A5' },
  event_awards: { label: 'Awards',        color: '#b0885a' },
  wtet_awards:  { label: 'Awards',        color: '#b0885a' },
}
const categoryOf = action => (action || '').split('.')[0]

// Where "Open in section →" points for each entity type
const SECTION_LINK = {
  member:         n => `/admin/members${n ? `?q=${encodeURIComponent(n)}` : ''}`,
  application:    () => '/admin/applications',
  contact:        () => '/admin/contacts',
  announcement:   () => '/admin/announcements',
  event:          () => '/admin/events',
  payment_intent: () => '/admin/payments',
  broadcast:      () => '/admin/broadcasts',
  promo_code:     () => '/admin/promo-codes',
  expense:        () => '/admin/expenses',
  link:           () => '/admin/links',
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: MONTREAL_TZ })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: MONTREAL_TZ }).toLowerCase()
  return `${date} · ${time}`
}

function startOfDay(date) { const d = new Date(date); d.setHours(0, 0, 0, 0); return d }
function startOfWeek(date) { const d = startOfDay(date); d.setDate(d.getDate() - d.getDay()); return d }

const META_LABELS = {
  amount: 'Amount', audience: 'Audience', sent: 'Sent', failed: 'Failed',
  tier: 'Tier', status: 'Status', from: 'From', to: 'To', count: 'Count',
  date: 'Date', type: 'Type', fields: 'Fields changed', email: 'Email',
  percentOff: '% off', amountOff: '$ off', appliesTo: 'Applies to', published: 'Published',
}
function metaValue(k, v) {
  if (v == null || v === '') return '—'
  if (k === 'amount' || k === 'amountOff') { const n = parseFloat(v); if (Number.isFinite(n)) return `$${(n > 999 ? n / 100 : n).toFixed(2)}` }
  return String(v)
}

export default function ActivityLogClient({ logs }) {
  const [search, setSearch] = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [range, setRange] = useState('all') // all | today | 7d | 30d
  const [sort, setSort] = useState('newest')
  const [expanded, setExpanded] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = startOfWeek(now)
  const todayCount = logs.filter(l => new Date(l.created_at) >= todayStart).length
  const weekCount = logs.filter(l => new Date(l.created_at) >= weekStart).length

  // Filter options derived from the data itself — new entity types and action
  // categories appear automatically as new routes get instrumented
  const entityTypes = useMemo(() => [...new Set(logs.map(l => l.entity_type).filter(Boolean))].sort(), [logs])
  const categories = useMemo(() => [...new Set(logs.map(l => categoryOf(l.action)).filter(Boolean))].sort(), [logs])

  const filtered = useMemo(() => {
    const rangeStart = range === 'today' ? todayStart
      : range === '7d' ? new Date(Date.now() - 7 * 86400000)
      : range === '30d' ? new Date(Date.now() - 30 * 86400000)
      : null
    const rows = logs.filter(log => {
      if (entityTypeFilter !== 'all' && log.entity_type !== entityTypeFilter) return false
      if (categoryFilter !== 'all' && categoryOf(log.action) !== categoryFilter) return false
      if (rangeStart && new Date(log.created_at) < rangeStart) return false
      if (search) {
        const q = search.toLowerCase()
        if (![log.action, humanize(log.action), log.entity_name, log.admin_email, log.entity_type]
          .some(v => v?.toLowerCase().includes(q))) return false
      }
      return true
    })
    return sort === 'oldest' ? [...rows].reverse() : rows
  }, [logs, search, entityTypeFilter, categoryFilter, range, sort, todayStart])

  function Sentence({ log }) {
    const cat = CATEGORY_META[categoryOf(log.action)] || { color: '#999' }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.5rem', minWidth: 0 }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: cat.color, flexShrink: 0, alignSelf: 'center' }} />
        <span style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '500' }}>{humanize(log.action)}</span>
        {log.entity_name && <span style={{ fontSize: '13px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>— {log.entity_name}</span>}
      </span>
    )
  }

  function DetailPanel({ log }) {
    const metaEntries = Object.entries(log.metadata || {}).filter(([, v]) => v != null && v !== '')
    const link = SECTION_LINK[log.entity_type]?.(log.entity_name)
    return (
      <div style={{ padding: '0.85rem 1.25rem 1rem', background: '#faf9f7', borderTop: '0.5px solid rgba(0,0,0,0.05)', borderLeft: '3px solid #c5a882', animation: 'alFadeIn 0.2s ease both' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.5rem 1.25rem', marginBottom: metaEntries.length || link ? '0.75rem' : 0 }}>
          {[['Action', humanize(log.action)], ['What', log.entity_type ? `${log.entity_type.replace(/_/g, ' ')}${log.entity_name ? ` · ${log.entity_name}` : ''}` : '—'], ['By', log.admin_email || '—'], ['When', fmtDate(log.created_at)]].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '2px' }}>{k}</div>
              <div style={{ fontSize: '12px', color: '#444', wordBreak: 'break-word' }}>{v}</div>
            </div>
          ))}
          {metaEntries.map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '2px' }}>{META_LABELS[k] || k.replace(/_/g, ' ')}</div>
              <div style={{ fontSize: '12px', color: '#444', wordBreak: 'break-word' }}>{metaValue(k, v)}</div>
            </div>
          ))}
        </div>
        {link && (
          <a href={link} style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A6535', textDecoration: 'none' }}>
            Open in {log.entity_type.replace(/_/g, ' ')}s →
          </a>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
      <style>{`
        @keyframes alFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .al-row { transition: background 0.12s ease; }
        @media (hover: hover) { .al-row:hover { background: rgba(0,0,0,0.015); } }
      `}</style>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Activity Log</h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total actions', value: logs.length, color: '#1a1a1a' },
          { label: 'Today', value: todayCount, color: '#3B6B2F' },
          { label: 'This week', value: weekCount, color: '#8A6535' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.25rem 1.4rem' }}>
            <div style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: '2rem', fontWeight: '300', color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.3rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Date-range chips */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
        {[['all', 'All time'], ['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days']].map(([key, label]) => (
          <button key={key} onClick={() => setRange(key)}
            style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 14px', minHeight: '30px', borderRadius: '99px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', WebkitTapHighlightColor: 'transparent',
              border: range === key ? '0.5px solid #0F1E14' : '0.5px solid rgba(0,0,0,0.14)',
              background: range === key ? '#0F1E14' : 'none', color: range === key ? '#F5F1EC' : '#888' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '180px', maxWidth: '340px' }}>
          <input style={{ ...inp, paddingRight: search ? '2rem' : undefined }} placeholder="Search activity…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '16px', lineHeight: 1, padding: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>×</button>}
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <select style={{ ...sel, width: '140px', fontSize: '11px', padding: '0.62rem 2rem 0.62rem 0.75rem' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="all">All activity</option>
            {categories.map(c => <option key={c} value={c}>{CATEGORY_META[c]?.label || c}</option>)}
          </select>
          <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <select style={{ ...sel, width: '130px', fontSize: '11px', padding: '0.62rem 2rem 0.62rem 0.75rem' }} value={entityTypeFilter} onChange={e => setEntityTypeFilter(e.target.value)}>
            <option value="all">All types</option>
            {entityTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
          </select>
          <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <select style={{ ...sel, width: '110px', fontSize: '11px', padding: '0.62rem 2rem 0.62rem 0.75rem' }} value={sort} onChange={e => setSort(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
          <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div style={{ fontSize: '11px', color: '#bbb', letterSpacing: '0.06em', marginLeft: 'auto' }}>
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        </div>
      </div>

      {/* Log entries — every row expands with full readable detail */}
      {filtered.length === 0 ? (
        <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#bbb', lineHeight: '1.7', maxWidth: '380px', margin: '0 auto' }}>
            {search || entityTypeFilter !== 'all' || categoryFilter !== 'all' || range !== 'all'
              ? 'No entries match your filters.'
              : 'No activity logged yet. Actions will appear here as admins use the panel.'}
          </div>
        </div>
      ) : (
        <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          {filtered.map((log, idx) => (
            <div key={log.id} style={{ borderBottom: idx < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
              <div className="al-row" onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: isMobile ? '0.85rem 1rem' : '0.8rem 1.25rem', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Sentence log={log} />
                  {isMobile && (
                    <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px', paddingLeft: '1.05rem' }}>{fmtDate(log.created_at)}</div>
                  )}
                </div>
                {!isMobile && <div style={{ fontSize: '11px', color: '#999', flexShrink: 0 }}>{fmtDate(log.created_at)}</div>}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, transform: expanded === log.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              {expanded === log.id && <DetailPanel log={log} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
