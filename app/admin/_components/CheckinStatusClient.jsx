'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRealtimeSync } from './useRealtimeSync'

const CARD = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }

function Pill({ done, doneLabel, pendingLabel }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '3px 9px', borderRadius: '99px',
      color: done ? '#3B6B2F' : '#93333E',
      border: `0.5px solid ${done ? 'rgba(59,107,47,0.3)' : 'rgba(147,51,62,0.3)'}`,
      background: done ? 'rgba(59,107,47,0.06)' : 'rgba(147,51,62,0.05)',
      whiteSpace: 'nowrap',
    }}>
      {done ? doneLabel : pendingLabel}
    </span>
  )
}

const PAYMENT_LABEL = {
  authorized: { text: 'Hold — awaiting capture', color: '#7B5B2E' },
  pending:    { text: 'Payment pending', color: '#999' },
  paid:       { text: 'Paid', color: '#3B6B2F' },
}

// eventId: the event this status view is scoped to.
export default function CheckinStatusClient({ eventId }) {
  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedEmail, setExpandedEmail] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [declineConfirm, setDeclineConfirm] = useState(null) // application id
  const [actionError, setActionError] = useState(null)

  async function capturePayment(applicationId) {
    setBusyId(applicationId); setActionError(null)
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/capture`, { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setActionError(d.error || 'Capture failed.'); return }
      load()
    } catch { setActionError('Network error.') }
    finally { setBusyId(null) }
  }

  async function declinePayment(applicationId) {
    setBusyId(applicationId); setActionError(null)
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/reject`, { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setActionError(d.error || 'Decline failed.'); return }
      setDeclineConfirm(null)
      load()
    } catch { setActionError('Network error.') }
    finally { setBusyId(null) }
  }

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/checkin/${eventId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        setEvent(d.event)
        setParticipants(Array.isArray(d.participants) ? d.participants : [])
      })
      .catch(() => setParticipants([]))
      .finally(() => setLoading(false))
  }, [eventId])

  useEffect(() => { load() }, [load])
  useRealtimeSync(['event_checkins', 'applications', 'event_registrations'], load)

  const sections = event?.checkin_sections || []
  const hasTrip = sections.includes('trip_details')
  const hasWaiver = sections.includes('waiver')
  const hasLunch = sections.includes('lunch')

  const filtered = participants.filter(p => {
    if (filter === 'trip_missing' && p.trip_details) return false
    if (filter === 'waiver_missing' && p.waiver) return false
    if (filter === 'lunch_missing' && p.lunch?.length > 0) return false
    if (filter === 'incomplete') {
      const done = (!hasTrip || p.trip_details) && (!hasWaiver || p.waiver) && (!hasLunch || p.lunch?.length > 0)
      if (done) return false
    }
    if (search && !((p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.email || '').toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  const tripCount = participants.filter(p => p.trip_details).length
  const waiverCount = participants.filter(p => p.waiver).length
  const lunchCount = participants.filter(p => p.lunch?.length > 0).length
  const fullyDoneCount = participants.filter(p => (!hasTrip || p.trip_details) && (!hasWaiver || p.waiver) && (!hasLunch || p.lunch?.length > 0)).length
  const total = participants.length

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
  if (!event) return <div style={{ padding: '2rem', textAlign: 'center', fontSize: '13px', color: '#93333E' }}>Failed to load.</div>

  if (!event.checkin_enabled) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Check-in isn't enabled for this event yet — turn it on in the Settings tab.</div>
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ ...CARD, padding: '1.1rem 1.3rem' }}>
          <div style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '2rem', fontWeight: '400', color: fullyDoneCount === total && total > 0 ? '#3B6B2F' : '#1a1a1a', lineHeight: 1, letterSpacing: '0.03em' }}>{fullyDoneCount}<span style={{ fontSize: '1rem', color: '#ccc' }}>/{total}</span></div>
          <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.4rem' }}>Fully checked in</div>
        </div>
        {hasTrip && (
          <div style={{ ...CARD, padding: '1.1rem 1.3rem' }}>
            <div style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '2rem', fontWeight: '400', color: tripCount === total && total > 0 ? '#3B6B2F' : '#1a1a1a', lineHeight: 1, letterSpacing: '0.03em' }}>{tripCount}<span style={{ fontSize: '1rem', color: '#ccc' }}>/{total}</span></div>
            <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.4rem' }}>Trip details</div>
          </div>
        )}
        {hasWaiver && (
          <div style={{ ...CARD, padding: '1.1rem 1.3rem' }}>
            <div style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '2rem', fontWeight: '400', color: waiverCount === total && total > 0 ? '#3B6B2F' : '#1a1a1a', lineHeight: 1, letterSpacing: '0.03em' }}>{waiverCount}<span style={{ fontSize: '1rem', color: '#ccc' }}>/{total}</span></div>
            <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.4rem' }}>Waivers signed</div>
          </div>
        )}
        {hasLunch && (
          <div style={{ ...CARD, padding: '1.1rem 1.3rem' }}>
            <div style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '2rem', fontWeight: '400', color: lunchCount === total && total > 0 ? '#3B6B2F' : '#1a1a1a', lineHeight: 1, letterSpacing: '0.03em' }}>{lunchCount}<span style={{ fontSize: '1rem', color: '#ccc' }}>/{total}</span></div>
            <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.4rem' }}>Lunch selected</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or email…"
          style={{ padding: '0.5rem 0.75rem', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '12px', fontFamily: 'var(--font-inter),sans-serif', flex: '1 1 200px', maxWidth: '260px' }}
        />
        {[
          { id: 'all', label: 'All' },
          { id: 'incomplete', label: 'Anything missing' },
          ...(hasTrip ? [{ id: 'trip_missing', label: 'Trip details missing' }] : []),
          ...(hasWaiver ? [{ id: 'waiver_missing', label: 'Waiver missing' }] : []),
          ...(hasLunch ? [{ id: 'lunch_missing', label: 'Lunch missing' }] : []),
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 11px', borderRadius: '99px', border: `0.5px solid ${filter === f.id ? 'rgba(15,30,20,0.5)' : 'rgba(0,0,0,0.15)'}`, background: filter === f.id ? '#0F1E14' : 'transparent', color: filter === f.id ? '#F5F1EC' : '#666', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
            {f.label}
          </button>
        ))}
        <span style={{ fontSize: '11px', color: '#aaa', marginLeft: 'auto' }}>{filtered.length} of {total}</span>
      </div>

      {actionError && (
        <div style={{ fontSize: '12px', color: '#93333E', padding: '0.6rem 0.9rem', background: 'rgba(147,51,62,0.05)', border: '0.5px solid rgba(147,51,62,0.2)', borderRadius: '8px', marginBottom: '1rem' }}>{actionError}</div>
      )}

      {filtered.length === 0 ? (
        <div style={{ ...CARD, padding: '2.5rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>
          {total === 0 ? 'No registrants for this event yet.' : 'No participants match this filter.'}
        </div>
      ) : (
        <div style={{ ...CARD, overflow: 'hidden' }}>
          {filtered.map((p, idx) => {
            const isOpen = expandedEmail === p.email
            return (
              <div key={p.email}>
                <div
                  onClick={() => setExpandedEmail(isOpen ? null : p.email)}
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1.25rem', borderBottom: idx < filtered.length - 1 || isOpen ? '0.5px solid rgba(0,0,0,0.06)' : 'none', cursor: 'pointer', flexWrap: 'wrap' }}
                >
                  <div style={{ minWidth: 0, flex: '1 1 200px' }}>
                    <div style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '500' }}>{p.name || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#999' }}>{p.email}</div>
                  </div>
                  {p.paymentStatus && PAYMENT_LABEL[p.paymentStatus] && (
                    <span style={{ fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: PAYMENT_LABEL[p.paymentStatus].color, whiteSpace: 'nowrap' }}>
                      {PAYMENT_LABEL[p.paymentStatus].text}
                    </span>
                  )}
                  {hasTrip && <Pill done={!!p.trip_details} doneLabel="Trip ✓" pendingLabel="Trip missing" />}
                  {hasWaiver && <Pill done={!!p.waiver} doneLabel="Waiver ✓" pendingLabel="Waiver missing" />}
                  {hasLunch && <Pill done={p.lunch?.length > 0} doneLabel="Lunch ✓" pendingLabel="Lunch missing" />}
                </div>
                {isOpen && (
                  <>
                  <div style={{ padding: '1rem 1.25rem 1.25rem', background: '#fafaf9', borderBottom: p.paymentStatus === 'authorized' ? 'none' : (idx < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none'), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                    {hasTrip && (
                      <div>
                        <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.5rem' }}>Trip Details</div>
                        {p.trip_details ? (
                          <div style={{ fontSize: '12px', color: '#444', lineHeight: 1.8 }}>
                            {p.trip_details.passengers_list?.map((pp, i) => (
                              <span key={i}>{i === 0 ? 'Driver' : `Passenger ${i + 1}`}: {pp.name}, age {pp.age || '—'}<br /></span>
                            ))}
                            {p.trip_details.dietary && <>Dietary: {p.trip_details.dietary}<br /></>}
                            {p.trip_details.whatsapp && <>WhatsApp: {p.trip_details.whatsapp}<br /></>}
                          </div>
                        ) : <div style={{ fontSize: '12px', color: '#bbb' }}>Not submitted yet.</div>}
                      </div>
                    )}
                    {hasWaiver && (
                      <div>
                        <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.5rem' }}>Waiver</div>
                        {p.waiver ? (
                          <div style={{ fontSize: '12px', color: '#444', lineHeight: 1.8 }}>
                            Signed by <strong>{p.waiver.full_name}</strong><br />
                            {new Date(p.waiver.signed_at).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' })}<br />
                            Vehicle: {[p.waiver.vehicle?.year, p.waiver.vehicle?.make, p.waiver.vehicle?.model].filter(Boolean).join(' ') || '—'}<br />
                            Emergency contact: {p.waiver.emergency_contact?.name} · {p.waiver.emergency_contact?.phone}
                          </div>
                        ) : <div style={{ fontSize: '12px', color: '#bbb' }}>Not signed yet.</div>}
                      </div>
                    )}
                    {hasLunch && (
                      <div>
                        <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.5rem' }}>Lunch</div>
                        {p.lunch?.length > 0 ? (
                          <div style={{ fontSize: '12px', color: '#444', lineHeight: 1.8 }}>
                            {p.lunch.map((entry, i) => (
                              <div key={i}>{entry.name || (i === 0 ? 'Driver' : `Passenger ${i + 1}`)}: {entry.dish_name}</div>
                            ))}
                          </div>
                        ) : <div style={{ fontSize: '12px', color: '#bbb' }}>Not selected yet.</div>}
                      </div>
                    )}
                  </div>
                  {p.paymentStatus === 'authorized' && p.applicationId && (
                    <div style={{ padding: '0 1.25rem 1.1rem', background: '#fafaf9', borderBottom: idx < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => capturePayment(p.applicationId)} disabled={busyId === p.applicationId}
                          style={{ padding: '0.5rem 1.1rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', borderRadius: '8px', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: busyId === p.applicationId ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                          {busyId === p.applicationId ? 'Working…' : 'Capture Payment'}
                        </button>
                        {declineConfirm === p.applicationId ? (
                          <>
                            <span style={{ fontSize: '11px', color: '#93333E' }}>Decline and release the hold?</span>
                            <button type="button" onClick={() => declinePayment(p.applicationId)} disabled={busyId === p.applicationId}
                              style={{ padding: '0.5rem 1rem', background: 'transparent', color: '#93333E', border: '0.5px solid rgba(147,51,62,0.4)', borderRadius: '8px', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: busyId === p.applicationId ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                              Yes, decline
                            </button>
                            <button type="button" onClick={() => setDeclineConfirm(null)}
                              style={{ padding: '0.5rem 1rem', background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => setDeclineConfirm(p.applicationId)} disabled={busyId === p.applicationId}
                            style={{ padding: '0.5rem 1.1rem', background: 'transparent', color: '#93333E', border: '0.5px solid rgba(147,51,62,0.35)', borderRadius: '8px', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: busyId === p.applicationId ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                            Decline
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
