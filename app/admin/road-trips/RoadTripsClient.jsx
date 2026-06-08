'use client'
import { useState, useEffect } from 'react'
import { inp, GhostBtn, CopyBtn } from '../_components/shared'
import { ExportButton } from '../_components/ExportModal'

const SECTION = { padding: 'clamp(1.5rem, 3vw, 2.5rem)' }
const CARD = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)' }
const TH = { padding: '0.65rem 1rem', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#999', fontWeight: '400', textAlign: 'left', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf8', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }
const TD = { padding: '0.75rem 1rem', fontSize: '13px', color: '#1a1a1a', borderBottom: '0.5px solid rgba(0,0,0,0.05)', fontFamily: 'var(--font-inter),sans-serif', verticalAlign: 'middle' }

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

function PaymentChip({ status }) {
  if (status === 'paid') {
    return (
      <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', border: '0.5px solid rgba(59,107,47,0.3)', background: 'rgba(59,107,47,0.1)', color: '#3B6B2F', whiteSpace: 'nowrap' }}>
        Paid
      </span>
    )
  }
  return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', border: '0.5px solid rgba(197,168,130,0.45)', background: 'rgba(197,168,130,0.15)', color: '#8A6535', whiteSpace: 'nowrap' }}>
      Pending
    </span>
  )
}

function AttendedIcon({ value }) {
  if (value === true)  return <span style={{ color: '#3B6B2F', fontSize: '13px' }}>✓</span>
  if (value === false) return <span style={{ color: '#7B2032', fontSize: '13px' }}>✗</span>
  return <span style={{ color: '#ccc', fontSize: '13px' }}>—</span>
}

export default function RoadTripsClient() {
  const [apps, setApps]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [activeEvent, setActiveEvent] = useState('All Events')

  useEffect(() => {
    fetch('/api/admin/applications')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setApps(Array.isArray(data) ? data : []) })
      .catch(() => setApps([]))
      .finally(() => setLoading(false))
  }, [])

  // Collect all unique road trip event names across all apps
  const allRoadTripEvents = Array.from(
    new Set(
      apps.flatMap(a =>
        (a.registrations || [])
          .filter(r => r.event && r.event !== 'Canvas Routes Membership')
          .map(r => r.event)
      )
    )
  ).sort()

  // Build flat rows: one row per road-trip registration
  const allRows = apps.flatMap(a =>
    (a.registrations || [])
      .filter(r => r.event && r.event !== 'Canvas Routes Membership')
      .map(r => ({ app: a, reg: r }))
  )

  // Filter to selected event
  const eventRows = activeEvent === 'All Events'
    ? allRows
    : allRows.filter(({ reg }) => reg.event === activeEvent)

  // Search filter
  const filtered = eventRows.filter(({ app }) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (app.name  || '').toLowerCase().includes(q) ||
      (app.email || '').toLowerCase().includes(q)
    )
  })

  // Stats for selected event
  const totalRegistered = filtered.length
  const paidCount       = filtered.filter(({ app }) => app.stripe_payment_status === 'paid').length
  const passengerCount  = filtered.reduce((sum, { app }) => sum + (Number(app.passengers) || 0), 0)

  return (
    <div style={SECTION}>
      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '0.35rem', fontFamily: 'var(--font-inter),sans-serif' }}>Admin</div>
        <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif', margin: 0 }}>Road Trips</h1>
      </div>

      {/* Event selector tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {['All Events', ...allRoadTripEvents].map(ev => {
          const active = activeEvent === ev
          return (
            <button
              key={ev}
              onClick={() => { setActiveEvent(ev); setSearch('') }}
              style={{
                padding: '0.4rem 1rem',
                fontSize: '11px', letterSpacing: '0.08em',
                fontFamily: 'var(--font-inter),sans-serif',
                cursor: 'pointer', transition: 'all 0.15s',
                border: active ? '0.5px solid rgba(0,0,0,0.25)' : '0.5px solid rgba(0,0,0,0.12)',
                background: active ? '#0F1E14' : '#fff',
                color: active ? '#F5F1EC' : '#555',
              }}
            >
              {ev}
            </button>
          )
        })}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Registered',  value: totalRegistered, color: '#1a1a1a' },
          { label: 'Paid',        value: paidCount,        color: '#3B6B2F' },
          { label: 'Passengers',  value: passengerCount,   color: '#1a1a1a' },
        ].map(s => (
          <div key={s.label} style={{ ...CARD, padding: '1.25rem 1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '300', color: s.color, lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.3rem', fontFamily: 'var(--font-inter),sans-serif' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', fontFamily: 'var(--font-inter),sans-serif' }}>
          {filtered.length} registrant{filtered.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...inp, width: '240px', paddingRight: search ? '2rem' : undefined }}
              placeholder="Search name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '16px', lineHeight: 1, padding: '2px', fontFamily: 'var(--font-inter),sans-serif' }}
              >×</button>
            )}
          </div>
          <ExportButton
            filename="road-trips"
            title="Road Trips"
            headers={['Name', 'Email', 'Car', 'Event', 'Passengers', 'Has Children', 'Payment', 'Registered', 'Attended']}
            rows={filtered.map(({ app, reg }) => [
              app.name || '',
              app.email || '',
              [app.car_year, app.car_model].filter(Boolean).join(' '),
              reg.event || '',
              app.passengers || '',
              app.has_children ? 'Yes' : '',
              app.stripe_payment_status || '',
              reg.registered_at ? new Date(reg.registered_at).toLocaleDateString('en-CA') : '',
              reg.attended === true ? 'Attended' : reg.attended === false ? 'No-show' : '',
            ])}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: 'var(--font-inter),sans-serif' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc', fontFamily: 'var(--font-inter),sans-serif' }}>
          {allRoadTripEvents.length === 0 ? 'No road trip registrations yet.' : 'No registrants match.'}
        </div>
      ) : (
        <div style={{ ...CARD, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr>
                <th style={TH}>Name</th>
                <th style={TH}>Email</th>
                {activeEvent === 'All Events' && <th style={TH}>Event</th>}
                <th style={TH}>Car</th>
                <th style={TH}>Passengers</th>
                <th style={TH}>Payment</th>
                <th style={TH}>Registered</th>
                <th style={{ ...TH, textAlign: 'center' }}>Attended</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ app, reg }, i) => {
                const car = [app.car_year, app.car_model].filter(Boolean).join(' ') || '—'
                const isLast = i === filtered.length - 1
                const tdStyle = isLast ? { ...TD, borderBottom: 'none' } : TD
                return (
                  <tr key={`${app.id}-${reg.event}-${i}`} style={{ transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafaf9'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span>{app.name || <span style={{ color: '#ccc' }}>—</span>}</span>
                        <CopyBtn value={app.email} />
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontSize: '12px', color: '#666' }}>{app.email || '—'}</td>
                    {activeEvent === 'All Events' && (
                      <td style={{ ...tdStyle, fontSize: '11px', color: '#888', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {reg.event}
                      </td>
                    )}
                    <td style={{ ...tdStyle, fontSize: '12px', color: '#888' }}>{car}</td>
                    <td style={{ ...tdStyle, fontSize: '12px', color: '#888' }}>
                      {app.passengers ? (
                        <span>
                          {app.passengers}
                          {app.has_children && (
                            <span style={{ marginLeft: '0.4rem', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A6535' }}>w/ kids</span>
                          )}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={tdStyle}><PaymentChip status={app.stripe_payment_status} /></td>
                    <td style={{ ...tdStyle, fontSize: '11px', color: '#bbb' }}>{fmtDate(reg.registered_at)}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}><AttendedIcon value={reg.attended} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
