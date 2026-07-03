'use client'
import { useState, useEffect, useCallback } from 'react'
import { GhostBtn, Err } from '../_components/shared'
import { useRealtimeSync } from '../_components/useRealtimeSync'
import WaiverViewerModal from '../_components/WaiverViewerModal'

const PAGE_STYLE = { padding: 'clamp(1.5rem, 3vw, 2.5rem)' }
const CARD = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }

function Pill({ done, doneLabel, pendingLabel }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '3px 9px', borderRadius: '99px',
      color: done ? '#3B6B2F' : '#7B2032',
      border: `0.5px solid ${done ? 'rgba(59,107,47,0.3)' : 'rgba(123,32,50,0.3)'}`,
      background: done ? 'rgba(59,107,47,0.06)' : 'rgba(123,32,50,0.05)',
      whiteSpace: 'nowrap',
    }}>
      {done ? doneLabel : pendingLabel}
    </span>
  )
}

export default function WtetClient() {
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [lunchCutoff, setLunchCutoff] = useState('')
  const [cutoffInput, setCutoffInput] = useState('')
  const [savingCutoff, setSavingCutoff] = useState(false)
  const [cutoffError, setCutoffError] = useState(null)
  const [cutoffSaved, setCutoffSaved] = useState(false)
  const [filter, setFilter] = useState('all') // all | waiver_missing | lunch_missing
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [viewingWaiver, setViewingWaiver] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/wtet')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        setParticipants(Array.isArray(d.participants) ? d.participants : [])
        setLunchCutoff(d.lunchCutoff || '')
        setCutoffInput(d.lunchCutoff ? toLocalInputValue(d.lunchCutoff) : '')
      })
      .catch(() => setParticipants([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])
  useRealtimeSync('applications', load)

  function toLocalInputValue(iso) {
    const d = new Date(iso)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  async function saveCutoff() {
    if (!cutoffInput) return
    setSavingCutoff(true); setCutoffError(null); setCutoffSaved(false)
    try {
      const res = await fetch('/api/admin/wtet', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lunchCutoff: new Date(cutoffInput).toISOString() }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setCutoffError(d.error || 'Failed to save.'); return }
      setLunchCutoff(new Date(cutoffInput).toISOString())
      setCutoffSaved(true)
      setTimeout(() => setCutoffSaved(false), 2500)
    } catch {
      setCutoffError('Network error.')
    } finally {
      setSavingCutoff(false)
    }
  }

  const filtered = participants.filter(p => {
    if (filter === 'waiver_missing' && p.wtet_waiver) return false
    if (filter === 'lunch_missing' && p.wtet_lunch) return false
    if (filter === 'trip_missing' && p.wtet_checkin) return false
    if (filter === 'incomplete' && p.wtet_waiver && p.wtet_lunch && p.wtet_checkin) return false
    if (search && !((p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.email || '').toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  const waiverCount = participants.filter(p => p.wtet_waiver).length
  const lunchCount = participants.filter(p => p.wtet_lunch).length
  const tripCount = participants.filter(p => p.wtet_checkin).length
  const fullyDoneCount = participants.filter(p => p.wtet_waiver && p.wtet_lunch && p.wtet_checkin).length
  const total = participants.length

  return (
    <div style={PAGE_STYLE}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>WTET — Waiver &amp; Lunch</h1>
        <p style={{ fontSize: '13px', color: '#888', margin: '0.5rem 0 0', fontFamily: 'var(--font-inter),sans-serif' }}>
          Whips to Eastern Townships — July 5, 2026. Track who still needs to sign the waiver or choose lunch.
        </p>
      </div>

      {/* Stat + cutoff row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ ...CARD, padding: '1.25rem 1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '2.2rem', fontWeight: '300', color: '#1a1a1a', lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.4rem' }}>Total participants</div>
        </div>
        <div style={{ ...CARD, padding: '1.25rem 1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '2.2rem', fontWeight: '300', color: fullyDoneCount === total && total > 0 ? '#3B6B2F' : '#1a1a1a', lineHeight: 1 }}>{fullyDoneCount}<span style={{ fontSize: '1.1rem', color: '#ccc' }}>/{total}</span></div>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.4rem' }}>Fully checked in</div>
        </div>
        <div style={{ ...CARD, padding: '1.25rem 1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '2.2rem', fontWeight: '300', color: tripCount === total && total > 0 ? '#3B6B2F' : '#1a1a1a', lineHeight: 1 }}>{tripCount}<span style={{ fontSize: '1.1rem', color: '#ccc' }}>/{total}</span></div>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.4rem' }}>Trip details</div>
        </div>
        <div style={{ ...CARD, padding: '1.25rem 1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '2.2rem', fontWeight: '300', color: waiverCount === total && total > 0 ? '#3B6B2F' : '#1a1a1a', lineHeight: 1 }}>{waiverCount}<span style={{ fontSize: '1.1rem', color: '#ccc' }}>/{total}</span></div>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.4rem' }}>Waivers signed</div>
        </div>
        <div style={{ ...CARD, padding: '1.25rem 1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '2.2rem', fontWeight: '300', color: lunchCount === total && total > 0 ? '#3B6B2F' : '#1a1a1a', lineHeight: 1 }}>{lunchCount}<span style={{ fontSize: '1.1rem', color: '#ccc' }}>/{total}</span></div>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.4rem' }}>Lunch selected</div>
        </div>
      </div>

      {/* Lunch cutoff editor */}
      <div style={{ ...CARD, padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: '0.75rem' }}>Lunch selection deadline</div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="datetime-local"
            value={cutoffInput}
            onChange={e => setCutoffInput(e.target.value)}
            style={{ padding: '0.55rem 0.75rem', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif' }}
          />
          <GhostBtn small onClick={saveCutoff} disabled={savingCutoff}>{savingCutoff ? 'Saving…' : 'Save'}</GhostBtn>
          {cutoffSaved && <span style={{ fontSize: '11px', color: '#3B6B2F' }}>✓ Saved</span>}
          {lunchCutoff && (
            <span style={{ fontSize: '11px', color: '#bbb' }}>
              Current: {new Date(lunchCutoff).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
        <Err msg={cutoffError} />
      </div>

      {/* Filter toolbar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or email…"
          style={{ padding: '0.5rem 0.75rem', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '12px', fontFamily: 'var(--font-inter),sans-serif', flex: '1 1 200px', maxWidth: '260px' }}
        />
        {[
          { id: 'all', label: 'All' },
          { id: 'incomplete', label: 'Anything missing' },
          { id: 'trip_missing', label: 'Trip details missing' },
          { id: 'waiver_missing', label: 'Waiver missing' },
          { id: 'lunch_missing', label: 'Lunch missing' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 11px', borderRadius: '99px', border: `0.5px solid ${filter === f.id ? 'rgba(15,30,20,0.5)' : 'rgba(0,0,0,0.15)'}`, background: filter === f.id ? '#0F1E14' : 'transparent', color: filter === f.id ? '#F5F1EC' : '#666', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
            {f.label}
          </button>
        ))}
        <span style={{ fontSize: '11px', color: '#aaa', marginLeft: 'auto' }}>{filtered.length} of {total}</span>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...CARD, padding: '3rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>
          {total === 0 ? 'No confirmed WTET participants yet.' : 'No participants match this filter.'}
        </div>
      ) : (
        <div style={{ ...CARD, overflow: 'hidden' }}>
          {filtered.map((p, idx) => {
            const isOpen = expandedId === p.id
            return (
              <div key={p.id}>
                <div
                  onClick={() => setExpandedId(isOpen ? null : p.id)}
                  className="admin-row-enter"
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1.25rem', borderBottom: idx < filtered.length - 1 || isOpen ? '0.5px solid rgba(0,0,0,0.06)' : 'none', cursor: 'pointer', flexWrap: 'wrap' }}
                >
                  <div style={{ minWidth: 0, flex: '1 1 200px' }}>
                    <div style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '500' }}>{p.name || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#999' }}>{p.email}</div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', flex: '0 0 auto', minWidth: '120px' }}>
                    {[p.car_year, p.car_make, p.car_model].filter(Boolean).join(' ') || '—'}
                  </div>
                  <Pill done={!!p.wtet_checkin} doneLabel="Trip ✓" pendingLabel="Trip missing" />
                  <Pill done={!!p.wtet_waiver} doneLabel="Waiver ✓" pendingLabel="Waiver missing" />
                  <Pill done={!!p.wtet_lunch} doneLabel="Lunch ✓" pendingLabel="Lunch missing" />
                </div>
                {isOpen && (
                  <div className="admin-panel-enter" style={{ padding: '1rem 1.25rem 1.25rem', background: '#fafaf9', borderBottom: idx < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.5rem' }}>Trip Details</div>
                      {p.wtet_checkin ? (
                        <div style={{ fontSize: '12px', color: '#444', lineHeight: 1.8 }}>
                          {p.wtet_checkin.passengers_list?.length > 0 && (
                            <>Passengers: {p.wtet_checkin.passengers_list.map(pp => `${pp.name} (${pp.age || '—'})`).join(', ')}<br /></>
                          )}
                          {p.wtet_checkin.dietary && <>Dietary: {p.wtet_checkin.dietary}<br /></>}
                          {p.wtet_checkin.whatsapp && <>WhatsApp: {p.wtet_checkin.whatsapp}<br /></>}
                          <span style={{ color: '#aaa' }}>Submitted {new Date(p.wtet_checkin.completed_at).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#bbb' }}>Not submitted yet.</div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.5rem' }}>Waiver</div>
                      {p.wtet_waiver ? (
                        <div style={{ fontSize: '12px', color: '#444', lineHeight: 1.8 }}>
                          Signed by <strong>{p.wtet_waiver.full_name}</strong><br />
                          {new Date(p.wtet_waiver.signed_at).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · IP {p.wtet_waiver.ip_address}<br />
                          Vehicle: {[p.wtet_waiver.vehicle?.year, p.wtet_waiver.vehicle?.make, p.wtet_waiver.vehicle?.model].filter(Boolean).join(' ') || '—'}<br />
                          Emergency contact: {p.wtet_waiver.emergency_contact?.name} · {p.wtet_waiver.emergency_contact?.phone}
                          {p.wtet_waiver.passengers?.length > 0 && (
                            <><br />Passengers: {p.wtet_waiver.passengers.map(pp => `${pp.name} (${pp.age || '—'})`).join(', ')}</>
                          )}
                          <br />
                          <button onClick={() => setViewingWaiver({ name: p.name, email: p.email, waiver: p.wtet_waiver })} style={{ background: 'none', border: 'none', padding: 0, marginTop: '0.4rem', cursor: 'pointer', color: '#8A6535', textDecoration: 'underline', fontSize: '11px', fontFamily: 'var(--font-inter),sans-serif' }}>View full waiver</button>
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#bbb' }}>Not signed yet.</div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.5rem' }}>Lunch</div>
                      {p.wtet_lunch ? (
                        <div style={{ fontSize: '12px', color: '#444', lineHeight: 1.8 }}>
                          {p.wtet_lunch.dish_name}<br />
                          <span style={{ color: '#aaa' }}>Selected {new Date(p.wtet_lunch.selected_at).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#bbb' }}>Not selected yet.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {viewingWaiver && (
        <WaiverViewerModal
          name={viewingWaiver.name}
          email={viewingWaiver.email}
          waiver={viewingWaiver.waiver}
          onClose={() => setViewingWaiver(null)}
        />
      )}
    </div>
  )
}
