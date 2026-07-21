'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRealtimeSync } from './useRealtimeSync'
import GenericWaiverViewerModal from './GenericWaiverViewerModal'

const SECTION_LABEL_MAP = { trip_details: 'Trip Details', waiver: 'Waiver', lunch: 'Lunch' }

function downloadFile(content, filename, mime) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: mime }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

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

// Every check-in section is immutable once submitted (see the reset-section
// API route's comment) — this is the self-serve admin escape hatch when a
// registrant needs to redo one after a typo or a changed plan.
function ResetLink({ email, section, resetConfirm, setResetConfirm, resetBusy, resetSection }) {
  const key = `${email}:${section}`
  const busy = resetBusy === key
  if (resetConfirm === key) {
    return (
      <span style={{ fontSize: '11px' }}>
        <span style={{ color: '#93333E' }}>Reset {SECTION_LABEL_MAP[section]} so they can redo it? </span>
        <button type="button" onClick={() => resetSection(email, section)} disabled={busy}
          style={{ background: 'none', border: 'none', padding: 0, cursor: busy ? 'wait' : 'pointer', color: '#93333E', textDecoration: 'underline', fontFamily: 'var(--font-inter),sans-serif' }}>
          {busy ? 'Resetting…' : 'Yes, reset'}
        </button>
        {' · '}
        <button type="button" onClick={() => setResetConfirm(null)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#888', textDecoration: 'underline', fontFamily: 'var(--font-inter),sans-serif' }}>
          Cancel
        </button>
      </span>
    )
  }
  return (
    <button type="button" onClick={() => setResetConfirm(key)}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#93333E', textDecoration: 'underline', fontSize: '11px', fontFamily: 'var(--font-inter),sans-serif' }}>
      Reset {SECTION_LABEL_MAP[section]}
    </button>
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
  const [showAddForm, setShowAddForm] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState(null)
  const [removeConfirm, setRemoveConfirm] = useState(null) // email
  const [removingEmail, setRemovingEmail] = useState(null)
  const [viewingWaiver, setViewingWaiver] = useState(null)
  const [resetConfirm, setResetConfirm] = useState(null) // `${email}:${section}`
  const [resetBusy, setResetBusy] = useState(null)
  const [copiedEmail, setCopiedEmail] = useState(null)

  function copyEmail(email) {
    if (!navigator?.clipboard?.writeText) return
    navigator.clipboard.writeText(email).then(() => {
      setCopiedEmail(email)
      setTimeout(() => setCopiedEmail(null), 1500)
    }).catch(() => {})
  }

  async function resetSection(email, section) {
    const key = `${email}:${section}`
    setResetBusy(key); setActionError(null)
    try {
      const res = await fetch(`/api/admin/checkin/${eventId}/reset-section`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, section }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setActionError(d.error || 'Failed to reset.'); return }
      setResetConfirm(null)
      load()
    } catch { setActionError('Network error.') }
    finally { setResetBusy(null) }
  }

  function exportRegistrantsCSV() {
    const rows = [
      ['Name', 'Email', 'Payment Status', 'Member', 'Promo Code', 'Discount', 'Car', 'Phone', 'Trip Details', 'Waiver Signed', 'Lunch Selected'],
      ...participants.map(p => [
        p.name || '', p.email, p.paymentStatus || '', p.isMember ? 'Yes' : 'No',
        p.discount?.code || '', p.discount ? (p.discount.amount / 100).toFixed(2) : '',
        [p.registration?.carYear, p.registration?.carMake, p.registration?.carModel].filter(Boolean).join(' '),
        p.registration?.phone || '',
        p.trip_details ? 'Yes' : 'No', p.waiver ? 'Yes' : 'No', p.lunch?.length > 0 ? 'Yes' : 'No',
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    downloadFile(csv, `registrants-${eventId}-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv')
  }

  async function addRegistrant(e) {
    e.preventDefault()
    setAdding(true); setAddError(null)
    try {
      const res = await fetch(`/api/admin/checkin/${eventId}/registrants`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName, email: addEmail }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setAddError(d.error || 'Failed to add registrant.'); return }
      setAddName(''); setAddEmail(''); setShowAddForm(false)
      load()
    } catch { setAddError('Network error.') }
    finally { setAdding(false) }
  }

  async function removeRegistrant(email) {
    setRemovingEmail(email); setActionError(null)
    try {
      const res = await fetch(`/api/admin/checkin/${eventId}/registrants`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setActionError(d.error || 'Failed to remove registrant.'); return }
      setRemoveConfirm(null)
      setExpandedEmail(prev => prev === email ? null : prev)
      load()
    } catch { setActionError('Network error.') }
    finally { setRemovingEmail(null) }
  }

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

  const load = useCallback(({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    fetch(`/api/admin/checkin/${eventId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        setEvent(d.event)
        setParticipants(Array.isArray(d.participants) ? d.participants : [])
      })
      .catch(() => { if (!silent) setParticipants([]) })
      .finally(() => { if (!silent) setLoading(false) })
  }, [eventId])

  useEffect(() => { load() }, [load])
  // Silent — a realtime event elsewhere (any application, any event's
  // check-in) shouldn't flash this whole panel back to a loading spinner
  // and collapse whichever registrant row the admin currently has open.
  useRealtimeSync(['event_checkins', 'applications', 'event_registrations'], () => load({ silent: true }))

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

      <div style={{ marginBottom: '1.1rem' }}>
        <button type="button" onClick={() => setShowAddForm(v => !v)}
          style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: '8px', border: '0.5px solid rgba(59,107,47,0.4)', background: showAddForm ? '#3B6B2F' : 'rgba(59,107,47,0.06)', color: showAddForm ? '#fff' : '#3B6B2F', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
          {showAddForm ? 'Cancel' : '+ Add Registrant'}
        </button>
        {showAddForm && (
          <form onSubmit={addRegistrant} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.75rem' }}>
            <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Name" required
              style={{ padding: '0.5rem 0.75rem', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '12px', fontFamily: 'var(--font-inter),sans-serif', flex: '1 1 160px', maxWidth: '220px' }} />
            <input value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="Email" type="email" required
              style={{ padding: '0.5rem 0.75rem', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '12px', fontFamily: 'var(--font-inter),sans-serif', flex: '1 1 200px', maxWidth: '260px' }} />
            <button type="submit" disabled={adding}
              style={{ padding: '0.5rem 1.1rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', borderRadius: '8px', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: adding ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
              {adding ? 'Adding…' : 'Add'}
            </button>
            {addError && <div style={{ fontSize: '11px', color: '#93333E', width: '100%' }}>{addError}</div>}
            <div style={{ fontSize: '10.5px', color: '#aaa', width: '100%' }}>Added registrants are marked as confirmed — for walk-ins, comps, or anyone who registered outside the normal flow.</div>
          </form>
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
        <span style={{ fontSize: '11px', color: '#aaa' }}>{filtered.length} of {total}</span>
        {total > 0 && (
          <button type="button" onClick={exportRegistrantsCSV}
            style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 11px', borderRadius: '99px', border: '0.5px solid rgba(0,0,0,0.15)', background: 'transparent', color: '#666', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', marginLeft: 'auto' }}>
            Export CSV
          </button>
        )}
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
                    <div style={{ fontSize: '11px', color: '#999', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {p.email}
                      <button type="button" onClick={e => { e.stopPropagation(); copyEmail(p.email) }}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: copiedEmail === p.email ? '#3B6B2F' : '#ccc', fontSize: '10px' }}>
                        {copiedEmail === p.email ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  {[p.registration?.carYear, p.registration?.carMake, p.registration?.carModel].filter(Boolean).length > 0 && (
                    <div style={{ fontSize: '12px', color: '#888', flex: '0 0 auto', minWidth: '110px' }}>
                      {[p.registration?.carYear, p.registration?.carMake, p.registration?.carModel].filter(Boolean).join(' ')}
                    </div>
                  )}
                  {p.paymentStatus && PAYMENT_LABEL[p.paymentStatus] && (
                    <span style={{ fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: PAYMENT_LABEL[p.paymentStatus].color, whiteSpace: 'nowrap' }}>
                      {PAYMENT_LABEL[p.paymentStatus].text}
                    </span>
                  )}
                  {p.isMember && (
                    <span style={{ fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c5a882', border: '0.5px solid rgba(197,168,130,0.5)', borderRadius: '99px', padding: '2px 8px', whiteSpace: 'nowrap' }}>
                      Member
                    </span>
                  )}
                  {p.discount && (
                    <span style={{ fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.4)', borderRadius: '99px', padding: '2px 8px', whiteSpace: 'nowrap' }}>
                      {p.discount.code ? `Promo ${p.discount.code}` : 'Promo'} −${(p.discount.amount / 100).toFixed(0)}
                    </span>
                  )}
                  {hasTrip && <Pill done={!!p.trip_details} doneLabel="Trip ✓" pendingLabel="Trip missing" />}
                  {hasWaiver && <Pill done={!!p.waiver} doneLabel="Waiver ✓" pendingLabel="Waiver missing" />}
                  {hasLunch && <Pill done={p.lunch?.length > 0} doneLabel="Lunch ✓" pendingLabel="Lunch missing" />}
                </div>
                {isOpen && (
                  <>
                  <div style={{ padding: '1rem 1.25rem 1.25rem', background: '#fafaf9', borderBottom: p.paymentStatus === 'authorized' ? 'none' : (idx < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none'), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                    {p.registration && (
                      <div>
                        <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.5rem' }}>Registration Details</div>
                        <div style={{ fontSize: '12px', color: '#444', lineHeight: 1.8 }}>
                          {(p.registration.carYear || p.registration.carMake || p.registration.carModel) && (
                            <>Car: {[p.registration.carYear, p.registration.carMake, p.registration.carModel].filter(Boolean).join(' ')}<br /></>
                          )}
                          {p.registration.phone && <>Phone: {p.registration.phone}<br /></>}
                          {p.registration.instagram && <>Instagram: @{p.registration.instagram}<br /></>}
                          {p.registration.passengers && <>Passengers: {p.registration.passengers}<br /></>}
                          {p.registration.hasChildren && (
                            <>Children: {p.registration.hasChildren === 'yes' ? `Yes${p.registration.childrenAges ? ` (ages ${p.registration.childrenAges})` : ''}` : 'No'}<br /></>
                          )}
                          {p.registration.dob && <>DOB: {p.registration.dob}<br /></>}
                          {p.registration.source && <>Heard about us via: {p.registration.source}<br /></>}
                          {p.registration.message && <>Message: {p.registration.message}<br /></>}
                        </div>
                      </div>
                    )}
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
                            {p.trip_details.completed_at && (
                              <span style={{ color: '#aaa' }}>Submitted {new Date(p.trip_details.completed_at).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' })}</span>
                            )}
                            <br />
                            <ResetLink email={p.email} section="trip_details" resetConfirm={resetConfirm} setResetConfirm={setResetConfirm} resetBusy={resetBusy} resetSection={resetSection} />
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
                            {new Date(p.waiver.signed_at).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' })} · IP {p.waiver.ip_address}<br />
                            Vehicle: {[p.waiver.vehicle?.year, p.waiver.vehicle?.make, p.waiver.vehicle?.model].filter(Boolean).join(' ') || '—'}<br />
                            Emergency contact: {p.waiver.emergency_contact?.name} · {p.waiver.emergency_contact?.phone}
                            <br />
                            <button type="button" onClick={() => setViewingWaiver({ name: p.name, email: p.email, waiver: p.waiver })}
                              style={{ background: 'none', border: 'none', padding: 0, marginTop: '0.4rem', marginRight: '1rem', cursor: 'pointer', color: '#8A6535', textDecoration: 'underline', fontSize: '11px', fontFamily: 'var(--font-inter),sans-serif' }}>
                              View full waiver
                            </button>
                            <ResetLink email={p.email} section="waiver" resetConfirm={resetConfirm} setResetConfirm={setResetConfirm} resetBusy={resetBusy} resetSection={resetSection} />
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
                            {p.lunch[0]?.selected_at && (
                              <span style={{ color: '#aaa' }}>Selected {new Date(p.lunch[0].selected_at).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' })}</span>
                            )}
                            <br />
                            <ResetLink email={p.email} section="lunch" resetConfirm={resetConfirm} setResetConfirm={setResetConfirm} resetBusy={resetBusy} resetSection={resetSection} />
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
                  {p.paymentStatus !== 'authorized' && (
                    <div style={{ padding: '0 1.25rem 1.1rem', background: '#fafaf9', borderBottom: idx < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                      {removeConfirm === p.email ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: '#93333E' }}>Remove {p.name || p.email} from this event's registrants?</span>
                          <button type="button" onClick={() => removeRegistrant(p.email)} disabled={removingEmail === p.email}
                            style={{ padding: '0.5rem 1rem', background: 'transparent', color: '#93333E', border: '0.5px solid rgba(147,51,62,0.4)', borderRadius: '8px', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: removingEmail === p.email ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                            {removingEmail === p.email ? 'Removing…' : 'Yes, remove'}
                          </button>
                          <button type="button" onClick={() => setRemoveConfirm(null)}
                            style={{ padding: '0.5rem 1rem', background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setRemoveConfirm(p.email)}
                          style={{ padding: '0.5rem 1.1rem', background: 'transparent', color: '#93333E', border: '0.5px solid rgba(147,51,62,0.35)', borderRadius: '8px', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                          Remove Registrant
                        </button>
                      )}
                    </div>
                  )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
      {viewingWaiver && (
        <GenericWaiverViewerModal
          eventName={event?.name || 'Canvas Routes'}
          name={viewingWaiver.name}
          email={viewingWaiver.email}
          waiver={viewingWaiver.waiver}
          onClose={() => setViewingWaiver(null)}
        />
      )}
    </div>
  )
}
