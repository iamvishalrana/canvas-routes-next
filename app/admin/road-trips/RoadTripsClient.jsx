'use client'
import { useState, useEffect } from 'react'
import { inp, CopyBtn } from '../_components/shared'
import { ExportButton } from '../_components/ExportModal'

const SECTION = { padding: 'clamp(1.5rem, 3vw, 2.5rem)' }
const CARD    = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)' }
const TH      = { padding: '0.65rem 1rem', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#999', fontWeight: '400', textAlign: 'left', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf8', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }
const TD      = { padding: '0.75rem 1rem', fontSize: '13px', color: '#1a1a1a', borderBottom: '0.5px solid rgba(0,0,0,0.05)', fontFamily: 'var(--font-inter),sans-serif', verticalAlign: 'middle' }

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

function AttendedChip({ value }) {
  if (value === true)  return <span style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', border: '0.5px solid rgba(59,107,47,0.3)', background: 'rgba(59,107,47,0.08)', color: '#3B6B2F' }}>Attended</span>
  if (value === false) return <span style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', border: '0.5px solid rgba(123,32,50,0.3)', background: 'rgba(123,32,50,0.06)', color: '#7B2032' }}>No-show</span>
  return <span style={{ fontSize: '10px', color: '#ccc' }}>—</span>
}

function isRoadTrip(eventName) {
  if (!eventName) return false
  const lower = eventName.toLowerCase()
  return (
    lower !== 'canvas routes membership' &&
    !lower.includes('cars & coffee') &&
    !lower.includes('cars and coffee')
  )
}

export default function RoadTripsClient() {
  const [apps, setApps]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [activeTrip, setActiveTrip]   = useState('all')
  const [isMobile, setIsMobile]       = useState(false)

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetch('/api/admin/applications')
      .then(r => r.ok ? r.json() : [])
      .then(data => setApps(Array.isArray(data) ? data : []))
      .catch(() => setApps([]))
      .finally(() => setLoading(false))
  }, [])

  // Only actual road trip events
  const trips = Array.from(
    new Set(
      apps.flatMap(a =>
        (a.registrations || []).filter(r => isRoadTrip(r.event)).map(r => r.event)
      )
    )
  ).sort()

  // All road trip rows
  const allRows = apps.flatMap(a =>
    (a.registrations || [])
      .filter(r => isRoadTrip(r.event))
      .map(r => ({ app: a, reg: r }))
  )

  const filtered = allRows
    .filter(({ reg }) => activeTrip === 'all' || reg.event === activeTrip)
    .filter(({ app }) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (app.name || '').toLowerCase().includes(q) || (app.email || '').toLowerCase().includes(q)
    })

  const attended  = filtered.filter(({ reg }) => reg.attended === true).length
  const noShows   = filtered.filter(({ reg }) => reg.attended === false).length
  const pending   = filtered.filter(({ reg }) => reg.attended == null).length

  return (
    <div style={SECTION}>
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '0.35rem', fontFamily: 'var(--font-inter),sans-serif' }}>Admin</div>
        <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif', margin: 0 }}>Road Trips</h1>
      </div>

      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : trips.length === 0 ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No road trip registrations yet.</div>
      ) : (
        <>
          {/* Trip tabs — only shown when more than one trip */}
          {trips.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {[{ id: 'all', label: 'All Trips' }, ...trips.map(t => ({ id: t, label: t }))].map(t => {
                const active = activeTrip === t.id
                return (
                  <button key={t.id} onClick={() => { setActiveTrip(t.id); setSearch('') }} style={{
                    padding: '0.4rem 1rem', fontSize: '11px', letterSpacing: '0.06em',
                    fontFamily: 'var(--font-inter),sans-serif', cursor: 'pointer',
                    border: active ? '0.5px solid rgba(0,0,0,0.25)' : '0.5px solid rgba(0,0,0,0.12)',
                    background: active ? '#0F1E14' : '#fff',
                    color: active ? '#F5F1EC' : '#555', transition: 'all 0.15s',
                  }}>{t.label}</button>
                )
              })}
            </div>
          )}

          {/* Active trip name when only one */}
          {trips.length === 1 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '13px', color: '#555', fontFamily: 'var(--font-inter),sans-serif' }}>{trips[0]}</span>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
            {[
              { label: 'Total',     value: filtered.length, color: '#1a1a1a' },
              { label: 'Attended',  value: attended,        color: '#3B6B2F' },
              { label: 'No-show',   value: noShows,         color: '#7B2032' },
              { label: 'Unset',     value: pending,         color: '#aaa'    },
            ].map(s => (
              <div key={s.label} style={{ ...CARD, padding: '1.1rem 1.25rem' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: '300', color: s.color, lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif' }}>{s.value}</div>
                <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.3rem', fontFamily: 'var(--font-inter),sans-serif' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search + Export */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', fontFamily: 'var(--font-inter),sans-serif' }}>
              {filtered.length} registrant{filtered.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...inp, width: '220px', paddingRight: search ? '2rem' : undefined }}
                  placeholder="Search name or email…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '16px', lineHeight: 1, padding: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>×</button>
                )}
              </div>
              <ExportButton
                filename="road-trips"
                title="Road Trips"
                headers={['Name', 'Email', 'Car', 'Trip', 'Passengers', 'Registered', 'Attended']}
                rows={filtered.map(({ app, reg }) => [
                  app.name || '',
                  app.email || '',
                  [app.car_year, app.car_model].filter(Boolean).join(' '),
                  reg.event || '',
                  app.passengers || '',
                  reg.registered_at ? new Date(reg.registered_at).toLocaleDateString('en-CA') : '',
                  reg.attended === true ? 'Attended' : reg.attended === false ? 'No-show' : '',
                ])}
              />
            </div>
          </div>

          {/* Table / Cards */}
          {filtered.length === 0 ? (
            <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No registrants match.</div>
          ) : isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filtered.map(({ app, reg }, i) => (
                <div key={`${app.id}-${i}`} style={{ ...CARD, padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                    <div style={{ fontWeight: '500', fontSize: '14px', color: '#1a1a1a' }}>{app.name || '—'}</div>
                    <AttendedChip value={reg.attended} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.3rem' }}>{app.email}</div>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '0.4rem' }}>
                    {[app.car_year, app.car_model].filter(Boolean).join(' ') || '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#bbb' }}>
                    Registered {fmtDate(reg.registered_at)}
                    {app.passengers ? ` · ${app.passengers} passenger${app.passengers > 1 ? 's' : ''}` : ''}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...CARD, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>Name</th>
                    <th style={TH}>Email</th>
                    <th style={TH}>Car</th>
                    {trips.length > 1 && activeTrip === 'all' && <th style={TH}>Trip</th>}
                    <th style={TH}>Passengers</th>
                    <th style={TH}>Registered</th>
                    <th style={TH}>Attended</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ app, reg }, i) => {
                    const isLast = i === filtered.length - 1
                    const td = isLast ? { ...TD, borderBottom: 'none' } : TD
                    return (
                      <tr key={`${app.id}-${i}`}
                        onMouseEnter={e => e.currentTarget.style.background = '#fafaf9'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            {app.name || <span style={{ color: '#ccc' }}>—</span>}
                            <CopyBtn value={app.email} />
                          </div>
                        </td>
                        <td style={{ ...td, fontSize: '12px', color: '#666' }}>{app.email || '—'}</td>
                        <td style={{ ...td, fontSize: '12px', color: '#888' }}>
                          {[app.car_year, app.car_model].filter(Boolean).join(' ') || '—'}
                        </td>
                        {trips.length > 1 && activeTrip === 'all' && (
                          <td style={{ ...td, fontSize: '11px', color: '#888' }}>{reg.event}</td>
                        )}
                        <td style={{ ...td, fontSize: '12px', color: '#888' }}>
                          {app.passengers
                            ? `${app.passengers}${app.has_children ? ' w/ kids' : ''}`
                            : '—'}
                        </td>
                        <td style={{ ...td, fontSize: '11px', color: '#bbb' }}>{fmtDate(reg.registered_at)}</td>
                        <td style={td}><AttendedChip value={reg.attended} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
