'use client'
import { useState, useEffect, useCallback } from 'react'
import { parseCarMakeModel, GhostBtn, DangerBtn, PrimaryBtn, Err } from '../_components/shared'

function StatusChip({ rsvp }) {
  if (!rsvp) return <span style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.06em' }}>—</span>
  if (rsvp.confirmed_at) return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.35)', padding: '2px 8px', background: 'rgba(59,107,47,0.07)', whiteSpace: 'nowrap' }}>✓ Confirmed</span>
  )
  const expired = new Date(rsvp.expires_at) <= new Date()
  if (expired) return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', border: '0.5px solid rgba(0,0,0,0.12)', padding: '2px 8px', whiteSpace: 'nowrap' }}>Expired</span>
  )
  return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A6535', border: '0.5px solid rgba(197,168,130,0.4)', padding: '2px 8px', background: 'rgba(197,168,130,0.07)', whiteSpace: 'nowrap' }}>Awaiting RSVP</span>
  )
}

export default function EventApplicationsClient() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [inviting, setInviting] = useState({})   // { [appId-eventName]: true }
  const [inviteErr, setInviteErr] = useState({})
  const [inviteDone, setInviteDone] = useState({})
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/event-applications')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setEvents(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function sendInvite(app, ev) {
    const key = `${app.id}-${ev.name}`
    setInviting(p => ({ ...p, [key]: true }))
    setInviteErr(p => ({ ...p, [key]: null }))
    try {
      const res = await fetch('/api/admin/event-applications/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: app.id,
          eventName: ev.name,
          eventDate: ev.date,
          eventLocation: ev.location,
        }),
      })
      const d = await res.json()
      if (!res.ok) { setInviteErr(p => ({ ...p, [key]: d.error || 'Failed to send.' })); return }
      setInviteDone(p => ({ ...p, [key]: true }))
      load()
    } catch {
      setInviteErr(p => ({ ...p, [key]: 'Network error.' }))
    } finally {
      setInviting(p => ({ ...p, [key]: false }))
    }
  }

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '0.35rem' }}>Admin</div>
        <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', margin: 0 }}>Event Applications</h1>
        <p style={{ fontSize: '13px', color: '#888', margin: '0.4rem 0 0', fontFamily: 'var(--font-inter),sans-serif' }}>
          Applications grouped by event — review, invite, and track RSVPs.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : events.length === 0 ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No events found. Add events in the Events section first.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {events.map(ev => {
            const isOpen = expanded === ev.id
            const confirmedCount = ev.confirmed_count || 0
            const invitedCount = ev.invited_count || 0
            const totalApps = ev.total_applications || 0
            const spotsLeft = ev.capacity ? ev.capacity - confirmedCount : null

            return (
              <div key={ev.id} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)' }}>
                {/* Event header */}
                <button
                  onClick={() => setExpanded(isOpen ? null : ev.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '1rem' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a', fontFamily: 'var(--font-inter),sans-serif' }}>{ev.name}</span>
                      {ev.date_display && (
                        <span style={{ fontSize: '11px', color: '#888' }}>{ev.date_display}</span>
                      )}
                      {!ev.date_display && ev.date && (
                        <span style={{ fontSize: '11px', color: '#888' }}>{new Date(ev.date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}</span>
                      )}
                      <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: ev.type === 'Road Trip' ? '#8A6535' : '#888', background: ev.type === 'Road Trip' ? 'rgba(197,168,130,0.1)' : 'rgba(0,0,0,0.04)', padding: '1px 7px', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                        {ev.type}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
                    {/* Counters */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '300', color: '#1a1a1a', lineHeight: 1 }}>{totalApps}</div>
                        <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', marginTop: '2px' }}>Applied</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '300', color: '#8A6535', lineHeight: 1 }}>{invitedCount}</div>
                        <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', marginTop: '2px' }}>Invited</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '300', color: '#3B6B2F', lineHeight: 1 }}>{confirmedCount}</div>
                        <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', marginTop: '2px' }}>Confirmed</div>
                      </div>
                      {spotsLeft !== null && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: '300', color: spotsLeft <= 3 ? '#7B2032' : '#1a1a1a', lineHeight: 1 }}>{Math.max(0, spotsLeft)}</div>
                          <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', marginTop: '2px' }}>Spots left</div>
                        </div>
                      )}
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </button>

                {/* Applications list */}
                {isOpen && (
                  <div style={{ borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
                    {ev.applications.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>
                        No applications registered for this event yet.
                      </div>
                    ) : (
                      <>
                        {/* Table header */}
                        {!isMobile && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr 1fr 140px', padding: '0.6rem 1.5rem', background: '#fafaf9', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                            {['Name', 'Car', 'Member', 'RSVP', ''].map((h, i) => (
                              <div key={i} style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb' }}>{h}</div>
                            ))}
                          </div>
                        )}

                        {ev.applications.map((app, idx) => {
                          const key = `${app.id}-${ev.name}`
                          const { make, model } = parseCarMakeModel(app.car_model)
                          const car = [app.car_year, make, model].filter(Boolean).join(' ')
                          const isInvited = !!app.rsvp
                          const isConfirmed = !!app.rsvp?.confirmed_at

                          return (
                            <div key={app.id} style={{ borderBottom: idx < ev.applications.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                              {isMobile ? (
                                <div style={{ padding: '0.85rem 1.5rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                                    <div>
                                      <div style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '500', marginBottom: '0.15rem' }}>{app.name || '—'}</div>
                                      <div style={{ fontSize: '11px', color: '#888' }}>{car || '—'}</div>
                                    </div>
                                    <StatusChip rsvp={app.rsvp} />
                                  </div>
                                  {app.rsvp?.answers && (
                                    <RsvpAnswers answers={app.rsvp.answers} />
                                  )}
                                  <div style={{ marginTop: '0.65rem' }}>
                                    <InviteActions app={app} ev={ev} keyStr={key} inviting={inviting} inviteErr={inviteErr} inviteDone={inviteDone} sendInvite={sendInvite} isInvited={isInvited} isConfirmed={isConfirmed} />
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr 1fr 140px', padding: '0.85rem 1.5rem', alignItems: 'start', gap: '0.5rem' }}>
                                  <div>
                                    <div style={{ fontSize: '13px', color: '#1a1a1a', marginBottom: '0.1rem' }}>{app.name || '—'}</div>
                                    <div style={{ fontSize: '11px', color: '#aaa' }}>{app.email}</div>
                                    {app.rsvp?.answers && <RsvpAnswers answers={app.rsvp.answers} />}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#666' }}>{car || '—'}</div>
                                  <div>
                                    {app.is_member
                                      ? <span style={{ fontSize: '10px', color: '#3B6B2F', letterSpacing: '0.06em' }}>✓ Member</span>
                                      : <span style={{ fontSize: '10px', color: '#bbb' }}>—</span>}
                                  </div>
                                  <div><StatusChip rsvp={app.rsvp} /></div>
                                  <div>
                                    <InviteActions app={app} ev={ev} keyStr={key} inviting={inviting} inviteErr={inviteErr} inviteDone={inviteDone} sendInvite={sendInvite} isInvited={isInvited} isConfirmed={isConfirmed} />
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RsvpAnswers({ answers }) {
  if (!answers) return null
  return (
    <div style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {answers.dietary && (
        <span style={{ fontSize: '10px', color: '#666', background: 'rgba(0,0,0,0.04)', padding: '2px 7px', border: '0.5px solid rgba(0,0,0,0.1)' }}>
          {answers.dietary}
        </span>
      )}
      {answers.passengers !== undefined && answers.passengers !== null && (
        <span style={{ fontSize: '10px', color: '#666', background: 'rgba(0,0,0,0.04)', padding: '2px 7px', border: '0.5px solid rgba(0,0,0,0.1)' }}>
          {answers.passengers === 0 ? 'Solo' : `+${answers.passengers} passenger${answers.passengers !== 1 ? 's' : ''}`}
        </span>
      )}
    </div>
  )
}

function InviteActions({ app, ev, keyStr, inviting, inviteErr, inviteDone, sendInvite, isInvited, isConfirmed }) {
  if (isConfirmed) {
    return <span style={{ fontSize: '10px', color: '#3B6B2F', letterSpacing: '0.06em' }}>✓ Confirmed</span>
  }

  const busy = inviting[keyStr]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        <GhostBtn small onClick={() => sendInvite(app, ev)} disabled={busy}>
          {busy ? '…' : isInvited ? 'Re-send Invite' : 'Send Invite'}
        </GhostBtn>
      </div>
      {inviteErr[keyStr] && <div style={{ fontSize: '10px', color: '#7B2032' }}>{inviteErr[keyStr]}</div>}
      {inviteDone[keyStr] && !inviteErr[keyStr] && <div style={{ fontSize: '10px', color: '#3B6B2F' }}>Invite sent.</div>}
    </div>
  )
}
