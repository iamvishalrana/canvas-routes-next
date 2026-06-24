'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRealtimeSync } from '../_components/useRealtimeSync'
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

// Mirrors the NAME_ALIASES in the backend APIs so old event name strings
// (written before a rename) are normalized to the current canonical name.
const EVENT_NAME_ALIASES = {
  'into the laurentians — may 31, 2026': 'Into the Laurentians — June 7, 2026',
  'grand prix weekend cars & coffee — may 23, 2026': 'Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026',
}

function normalizeEventName(name) {
  if (!name) return name
  return EVENT_NAME_ALIASES[name.toLowerCase()] ?? name
}

// Uses events table type data + exclusion safety net.
// Only counts registrations with a real registered_at (not injected placeholders).
function isRoadTripReg(eventName, roadTripFragments) {
  if (!eventName) return false
  const lower = eventName.toLowerCase()
  if (lower === 'canvas routes membership') return false
  // Exclude all Cars & Coffee variants (ampersand, comma, or "and")
  if (lower.includes('cars & coffee') || lower.includes('cars and coffee') || lower.includes('cars, coffee')) return false
  // If events data is loaded, match against known Road Trip event names
  if (roadTripFragments.length > 0) return roadTripFragments.some(f => lower.includes(f))
  // Fallback when events haven't loaded yet: anything not excluded is a road trip
  return true
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function RoadTripsClient() {
  const [apps, setApps]             = useState([])
  const [events, setEvents]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [activeTrip, setActiveTrip] = useState('all')
  const [isMobile, setIsMobile]     = useState(false)
  const [selectedApp, setSelectedApp] = useState(null)

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/admin/applications').then(r => r.ok ? r.json() : []),
      fetch('/api/admin/events').then(r => r.ok ? r.json() : []),
    ])
      .then(([appsData, eventsData]) => {
        setApps(Array.isArray(appsData) ? appsData : [])
        setEvents(Array.isArray(eventsData) ? eventsData : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])
  useRealtimeSync(['applications', 'events'], load)

  // Names of events typed as Road Trip in the events table (lowercase for matching)
  const roadTripFragments = events
    .filter(e => e.type === 'Road Trip' || e.type === 'Route')
    .filter(e => e.name)
    .map(e => e.name.toLowerCase())

  // Build rows: real registrations only (registered_at !== null excludes placeholders),
  // normalized to current event names, then deduped by (email, event) so a person
  // who has both an old-name and new-name entry for the same trip only appears once.
  const rawRows = apps.flatMap(a =>
    (a.registrations || [])
      .filter(r => r.registered_at && isRoadTripReg(r.event, roadTripFragments))
      .map(r => ({ app: a, reg: { ...r, event: normalizeEventName(r.event) } }))
  )
  const seen = new Map()
  for (const row of rawRows) {
    const key = `${row.app.email}||${row.reg.event}`
    if (!seen.has(key)) seen.set(key, row)
  }
  const allRows = Array.from(seen.values())

  const trips = Array.from(new Set(allRows.map(({ reg }) => reg.event))).sort()

  const tabFiltered = allRows.filter(({ reg }) => activeTrip === 'all' || reg.event === activeTrip)
  const filtered = tabFiltered.filter(({ app }) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (app.name || '').toLowerCase().includes(q) || (app.email || '').toLowerCase().includes(q)
  })

  // All four stats use tabFiltered so they always add up
  const attended = tabFiltered.filter(({ reg }) => reg.attended === true).length
  const noShows  = tabFiltered.filter(({ reg }) => reg.attended === false).length
  const pending  = tabFiltered.filter(({ reg }) => reg.attended == null).length

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

          {/* Stats — all four derived from tabFiltered so they always add up */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
            {[
              { label: 'Total',    value: tabFiltered.length, color: '#1a1a1a' },
              { label: 'Attended', value: attended,           color: '#3B6B2F' },
              { label: 'No-show',  value: noShows,            color: '#7B2032' },
              { label: 'Unset',    value: pending,            color: '#aaa'    },
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
                headers={['Name', 'Email', 'Car', 'Trip', 'Passengers', 'Kids', 'Registered', 'Attended']}
                rows={filtered.map(({ app, reg }) => [
                  app.name || '',
                  app.email || '',
                  [app.car_year, app.car_model].filter(Boolean).join(' '),
                  reg.event || '',
                  app.passengers || '',
                  app.has_children === 'yes' ? 'Yes' : 'No',
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
                    <Link href={`/admin/contacts?q=${encodeURIComponent(app.email || '')}`} style={{ fontWeight: '500', fontSize: '14px', color: '#1a1a1a', textDecoration: 'none' }}>
                      {app.name || '—'}
                    </Link>
                    <AttendedChip value={reg.attended} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.3rem' }}>{app.email}</div>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '0.4rem' }}>
                    {[app.car_year, app.car_model].filter(Boolean).join(' ') || '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#bbb' }}>
                    {reg.registered_at ? `Registered ${fmtDate(reg.registered_at)}` : ''}
                    {app.passengers ? ` · ${app.passengers} passenger${app.passengers !== '1' ? 's' : ''}` : ''}
                    {app.has_children === 'yes' ? ' w/ kids' : ''}
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
                    <th style={TH}>Check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ app, reg }, i) => {
                    const isLast = i === filtered.length - 1
                    const td = isLast ? { ...TD, borderBottom: 'none' } : TD
                    const rowKey = `${app.id}-${i}`
                    const isSelected = selectedApp === rowKey
                    const checkin = app.wtet_checkin
                    return (
                      <>
                        <tr key={rowKey}
                          onClick={() => setSelectedApp(isSelected ? null : rowKey)}
                          style={{ cursor: 'pointer', background: isSelected ? '#faf9f6' : undefined }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafaf9' }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '' }}
                        >
                          <td style={td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Link
                                href={`/admin/contacts?q=${encodeURIComponent(app.email || '')}`}
                                onClick={e => e.stopPropagation()}
                                style={{ color: '#1a1a1a', textDecoration: 'none', fontWeight: '500' }}
                              >
                                {app.name || <span style={{ color: '#ccc', fontWeight: '400' }}>—</span>}
                              </Link>
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
                              ? `${app.passengers}${app.has_children === 'yes' ? ' w/ kids' : ''}`
                              : '—'}
                          </td>
                          <td style={{ ...td, fontSize: '11px', color: '#bbb' }}>{fmtDate(reg.registered_at)}</td>
                          <td style={td}><AttendedChip value={reg.attended} /></td>
                          <td style={{ ...td, fontSize: '11px' }}>
                            {checkin
                              ? <span style={{ color: '#3B6B2F', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Done</span>
                              : <span style={{ color: '#ddd' }}>—</span>}
                          </td>
                        </tr>
                        {isSelected && (
                          <tr key={`${rowKey}-panel`}>
                            <td colSpan={trips.length > 1 && activeTrip === 'all' ? 8 : 7} style={{ padding: 0, borderBottom: isLast ? 'none' : '0.5px solid rgba(0,0,0,0.05)' }}>
                              <div style={{ background: '#faf9f6', borderLeft: '3px solid #c5a882', padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                                <div>
                                  <div style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.3rem' }}>Passengers</div>
                                  {checkin?.passengers_list?.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                      {checkin.passengers_list.map((p, pi) => (
                                        <div key={pi} style={{ fontSize: '12px', color: '#1a1a1a' }}>
                                          {p.name}{p.age ? <span style={{ color: '#888', marginLeft: '0.3rem' }}>({p.age})</span> : null}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '13px', color: '#bbb' }}>Not provided</div>
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.3rem' }}>Dietary</div>
                                  <div style={{ fontSize: '13px', color: checkin?.dietary ? '#1a1a1a' : '#bbb' }}>{checkin?.dietary || 'None provided'}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.3rem' }}>WhatsApp</div>
                                  <div style={{ fontSize: '13px', color: checkin?.whatsapp ? '#1a1a1a' : '#bbb' }}>{checkin?.whatsapp || 'Not provided'}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.3rem' }}>Completed at</div>
                                  <div style={{ fontSize: '13px', color: checkin?.completed_at ? '#1a1a1a' : '#bbb' }}>{checkin?.completed_at ? fmtDateTime(checkin.completed_at) : '—'}</div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
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
