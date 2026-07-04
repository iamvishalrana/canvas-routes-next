'use client'
import { useState, useMemo, useEffect } from 'react'
import { inp, sel } from '../_components/shared'
import { MONTREAL_TZ } from '../../../lib/mtlTime'

const ENTITY_TYPES = ['member', 'application', 'contact', 'announcement', 'event']

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: MONTREAL_TZ })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: MONTREAL_TZ }).toLowerCase()
  return `${date} · ${time}`
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function MetadataCell({ metadata }) {
  const [open, setOpen] = useState(false)
  if (!metadata || Object.keys(metadata).length === 0) {
    return <span style={{ color: '#ddd', fontSize: '11px' }}>—</span>
  }

  // Show key fields inline when possible
  const keys = Object.keys(metadata)
  const inlineKeys = ['tier', 'status', 'from', 'to', 'count']
  const inlineEntries = keys.filter(k => inlineKeys.includes(k) || keys.length <= 2)

  if (!open && inlineEntries.length > 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
        {inlineEntries.slice(0, 3).map(k => (
          <span key={k} style={{ fontSize: '10px', letterSpacing: '0.05em', color: '#666', background: 'rgba(0,0,0,0.04)', border: '0.5px solid rgba(0,0,0,0.09)', padding: '1px 6px' }}>
            {k}: <strong style={{ color: '#333' }}>{String(metadata[k])}</strong>
          </span>
        ))}
        {keys.length > inlineEntries.length && (
          <button
            onClick={() => setOpen(true)}
            style={{ fontSize: '10px', color: '#c5a882', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.05em' }}
          >
            +{keys.length - inlineEntries.length} more
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <pre style={{ fontSize: '10px', color: '#555', background: 'rgba(0,0,0,0.03)', border: '0.5px solid rgba(0,0,0,0.08)', padding: '0.4rem 0.6rem', margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxWidth: '220px' }}>
        {JSON.stringify(metadata, null, 2)}
      </pre>
      <button
        onClick={() => setOpen(false)}
        style={{ fontSize: '10px', color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 0', fontFamily: 'var(--font-inter),sans-serif' }}
      >
        collapse
      </button>
    </div>
  )
}

export default function ActivityLogClient({ logs }) {
  const [search, setSearch] = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState('all')
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

  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (entityTypeFilter !== 'all' && log.entity_type !== entityTypeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const matchAction = log.action?.toLowerCase().includes(q)
        const matchName = log.entity_name?.toLowerCase().includes(q)
        const matchAdmin = log.admin_email?.toLowerCase().includes(q)
        if (!matchAction && !matchName && !matchAdmin) return false
      }
      return true
    })
  }, [logs, search, entityTypeFilter])

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Activity Log</h1>
      </div>
      {/* Note banner */}
      <div style={{ marginBottom: '1.5rem', padding: '0.85rem 1.1rem', background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.3)', display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span style={{ fontSize: '12px', color: '#8A6535', lineHeight: '1.55' }}>
          Actions are logged automatically when admins make changes. Historical data before this feature was enabled will not appear.
        </span>
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

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '340px' }}>
          <input
            style={{ ...inp, paddingRight: search ? '2rem' : undefined }}
            placeholder="Search action, entity name, admin…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '16px', lineHeight: 1, padding: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>×</button>
          )}
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <select
            style={{ ...sel, width: '160px', fontSize: '11px', padding: '0.62rem 2rem 0.62rem 0.75rem' }}
            value={entityTypeFilter}
            onChange={e => setEntityTypeFilter(e.target.value)}
          >
            <option value="all">All types</option>
            {ENTITY_TYPES.map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
          <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div style={{ fontSize: '11px', color: '#bbb', letterSpacing: '0.06em', marginLeft: 'auto' }}>
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        </div>
      </div>

      {/* Log entries */}
      {filtered.length === 0 ? (
        <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#bbb', lineHeight: '1.7', maxWidth: '380px', margin: '0 auto' }}>
            {search || entityTypeFilter !== 'all'
              ? 'No entries match your filters.'
              : 'No activity logged yet. Actions will appear here as admins use the panel.'
            }
          </div>
        </div>
      ) : isMobile ? (
        <div>
          {filtered.map((log, idx) => (
            <div key={log.id} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '0.85rem 1rem', marginBottom: '0.4rem' }}>
              <div style={{ fontFamily: 'monospace', fontWeight: '500', fontSize: '12px', color: '#1a1a1a', marginBottom: '0.3rem' }}>{log.action}</div>
              {(log.entity_type || log.entity_name) && (
                <div style={{ fontSize: '12px', color: '#555', marginBottom: '0.25rem' }}>
                  {log.entity_type && <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#aaa', marginRight: '0.3rem' }}>{log.entity_type}</span>}
                  {log.entity_name && <span style={{ color: '#333' }}>{log.entity_name}</span>}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                <div style={{ fontSize: '11px', color: '#888' }}>{log.admin_email || '—'}</div>
                <div style={{ fontSize: '11px', color: '#bbb' }}>{fmtDate(log.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr 1.4fr 1.6fr 1.4fr', padding: '0.65rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf9', alignItems: 'center' }}>
            {['Action', 'Entity', 'Admin', 'Metadata', 'Date / Time'].map(h => (
              <div key={h} style={{ fontSize: '10px', letterSpacing: '0.13em', textTransform: 'uppercase', color: '#999' }}>{h}</div>
            ))}
          </div>
          {filtered.map((log, idx) => (
            <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr 1.4fr 1.6fr 1.4fr', padding: '0.85rem 1.25rem', borderBottom: idx < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', alignItems: 'start' }}>
              <div style={{ fontWeight: '500', fontSize: '12px', color: '#1a1a1a', fontFamily: 'monospace', letterSpacing: '0.02em' }}>{log.action}</div>
              <div style={{ fontSize: '12px', color: '#555' }}>
                {log.entity_type || log.entity_name ? (
                  <span>
                    {log.entity_type && <span style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aaa', marginRight: '0.3rem' }}>{log.entity_type}</span>}
                    {log.entity_type && log.entity_name && <span style={{ color: '#c5a882', margin: '0 0.3rem', fontSize: '10px' }}>·</span>}
                    {log.entity_name && <span style={{ color: '#333' }}>{log.entity_name}</span>}
                  </span>
                ) : <span style={{ color: '#ddd', fontSize: '11px' }}>—</span>}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>{log.admin_email || <span style={{ color: '#ddd' }}>—</span>}</div>
              <div><MetadataCell metadata={log.metadata} /></div>
              <div style={{ fontSize: '11px', color: '#999' }}>{fmtDate(log.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
