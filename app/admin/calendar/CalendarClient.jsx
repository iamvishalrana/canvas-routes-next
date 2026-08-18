'use client'
import { useState, useEffect, useMemo } from 'react'
import { inp, GhostBtn, PrimaryBtn, DangerBtn, Err, CopyBtn, MONTHS } from '../_components/shared'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const pad2 = (n) => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`

export default function CalendarClient() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed
  const [events, setEvents] = useState([])
  const [birthdays, setBirthdays] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null) // 'YYYY-MM-DD' | null
  const [draft, setDraft] = useState('')
  const [savingDraft, setSavingDraft] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null) // note id
  const [notesErr, setNotesErr] = useState(null)

  const [sync, setSync] = useState(null) // { token, url, webcalUrl } | null
  const [syncErr, setSyncErr] = useState(null)
  const [regenConfirm, setRegenConfirm] = useState(false)
  const [regenBusy, setRegenBusy] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/admin/events').then(r => r.ok ? r.json() : []),
      fetch('/api/admin/birthdays').then(r => r.ok ? r.json() : []),
      fetch('/api/admin/calendar-notes').then(r => r.ok ? r.json() : []),
    ]).then(([ev, bd, nt]) => {
      setEvents(Array.isArray(ev) ? ev : [])
      setBirthdays(Array.isArray(bd) ? bd : [])
      setNotes(Array.isArray(nt) ? nt : [])
      setLoading(false)
    }).catch(() => setLoading(false))

    fetch('/api/admin/calendar/token')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setSync)
      .catch(() => setSyncErr('Could not load your sync link.'))
  }, [])

  async function regenerateLink() {
    setRegenBusy(true)
    try {
      const res = await fetch('/api/admin/calendar/token', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error()
      setSync(data)
      setRegenConfirm(false)
    } catch { setSyncErr('Failed to regenerate the link — try again.') }
    finally { setRegenBusy(false) }
  }

  // Index events/birthdays/notes by day-of-month for the CURRENTLY VIEWED
  // month/year, so the grid render is a cheap lookup instead of filtering
  // the full list per cell.
  const eventsByDay = useMemo(() => {
    const map = {}
    for (const e of events) {
      if (!e.date) continue
      const [y, m, d] = e.date.split('-').map(Number)
      if (y === year && m - 1 === month) (map[d] ||= []).push(e)
    }
    return map
  }, [events, year, month])

  const birthdaysByDay = useMemo(() => {
    const map = {}
    for (const b of birthdays) {
      if (b.month - 1 === month) (map[b.day] ||= []).push(b)
    }
    return map
  }, [birthdays, month])

  const notesByDay = useMemo(() => {
    const map = {}
    for (const n of notes) {
      if (!n.note_date) continue
      const [y, m, d] = n.note_date.split('-').map(Number)
      if (y === year && m - 1 === month) (map[d] ||= []).push(n)
    }
    return map
  }, [notes, year, month])

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow = new Date(year, month, 1).getDay()
  const slots = []
  for (let i = 0; i < 42; i++) {
    const day = i - firstDow + 1
    slots.push(day >= 1 && day <= daysInMonth ? day : null)
  }
  while (slots.length > 35 && slots.slice(-7).every(d => d === null)) slots.splice(-7)

  function changeMonth(delta) {
    let m = month + delta, y = year
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    setMonth(m); setYear(y)
  }
  function goToday() { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelectedDate(ymd(now.getFullYear(), now.getMonth(), now.getDate())) }

  const isTodayCell = (day) => year === now.getFullYear() && month === now.getMonth() && day === now.getDate()
  const selectedDay = selectedDate ? parseInt(selectedDate.slice(8, 10), 10) : null
  const selectedInView = selectedDate && selectedDate.slice(0, 7) === `${year}-${pad2(month + 1)}`

  async function addNote() {
    const content = draft.trim()
    if (!content || !selectedDate) return
    setSavingDraft(true); setNotesErr(null)
    try {
      const res = await fetch('/api/admin/calendar-notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_date: selectedDate, content }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save.')
      setNotes(prev => [...prev, data])
      setDraft('')
    } catch (err) { setNotesErr(err.message || 'Failed to save note.') }
    finally { setSavingDraft(false) }
  }

  function startEditNote(note) { setEditingNoteId(note.id); setEditDraft(note.content) }
  async function saveEditNote(id) {
    const content = editDraft.trim()
    if (!content) return
    try {
      const res = await fetch(`/api/admin/calendar-notes/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save.')
      setNotes(prev => prev.map(n => n.id === id ? data : n))
      setEditingNoteId(null)
    } catch (err) { setNotesErr(err.message || 'Failed to save note.') }
  }

  async function deleteNote(id) {
    try {
      const res = await fetch(`/api/admin/calendar-notes/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setNotes(prev => prev.filter(n => n.id !== id))
      setDeleteConfirm(null)
    } catch { setNotesErr('Failed to delete note.') }
  }

  const dayEvents = selectedDate ? (eventsByDay[selectedDay] || []) : []
  const dayBirthdays = selectedDate ? (birthdaysByDay[selectedDay] || []) : []
  const dayNotes = selectedDate ? (notes.filter(n => n.note_date === selectedDate)) : []

  return (
    <div style={{ padding: 'clamp(1.25rem, 3vw, 2.5rem)' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em' }}>Calendar</h1>
      </div>

      {/* Sync panel */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', marginBottom: '0.6rem' }}>Sync to your iPhone</div>
        {syncErr ? <Err msg={syncErr} /> : !sync ? (
          <div style={{ fontSize: '12px', color: '#bbb' }}>Loading your link…</div>
        ) : (
          <>
            <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.6, marginBottom: '0.75rem' }}>
              This link is personal — it includes events, everyone's birthday, and every note below. On your iPhone, open it in Safari to add it as a calendar subscription (Settings → Calendar → Accounts also works, using the link below). It re-checks for changes roughly once or twice a day, not instantly.
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <a href={sync.webcalUrl} className="admin-btn"
                style={{ display: 'inline-block', padding: '0.65rem 1.4rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', borderRadius: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none', fontFamily: 'var(--font-inter),sans-serif' }}>
                Subscribe on this device
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '11px', color: '#888', background: '#fafaf9', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.5rem 0.7rem', maxWidth: '100%' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px', fontFamily: 'monospace', fontSize: '10.5px' }}>{sync.url}</span>
                <CopyBtn value={sync.url} />
              </div>
              {!regenConfirm ? (
                <button onClick={() => setRegenConfirm(true)} style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '6px', color: '#999', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                  Regenerate link
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#93333E' }}>Old link stops working. Sure?</span>
                  <DangerBtn small onClick={regenerateLink} disabled={regenBusy}>{regenBusy ? '…' : 'Yes'}</DangerBtn>
                  <GhostBtn small onClick={() => setRegenConfirm(false)}>Cancel</GhostBtn>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <button onClick={() => changeMonth(-1)} aria-label="Previous month"
          style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '22px', fontWeight: 400, color: '#1a1a1a', minWidth: '170px' }}>{MONTHS[month]} {year}</div>
        <button onClick={() => changeMonth(1)} aria-label="Next month"
          style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <GhostBtn small onClick={goToday}>Today</GhostBtn>
      </div>

      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : (
        <div className="cal-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 340px)', gap: '1.25rem', alignItems: 'flex-start' }}>
          {/* Month grid */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
              {DOW.map(d => (
                <div key={d} style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#bbb', textAlign: 'center', padding: '0.5rem 0' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
              {slots.map((day, i) => {
                if (!day) return <div key={i} style={{ minHeight: '92px', borderRight: (i % 7 !== 6) ? '0.5px solid rgba(0,0,0,0.04)' : 'none', borderBottom: '0.5px solid rgba(0,0,0,0.04)', background: '#fbfbfa' }} />
                const dateStr = ymd(year, month, day)
                const dEvents = eventsByDay[day] || []
                const dBdays = birthdaysByDay[day] || []
                const dNotes = notesByDay[day] || []
                const isSelected = selectedDate === dateStr
                return (
                  <button key={i} onClick={() => setSelectedDate(dateStr)}
                    style={{
                      minHeight: '92px', textAlign: 'left', padding: '0.4rem', border: 'none', cursor: 'pointer',
                      borderRight: (i % 7 !== 6) ? '0.5px solid rgba(0,0,0,0.04)' : 'none',
                      borderBottom: '0.5px solid rgba(0,0,0,0.04)',
                      background: isSelected ? 'rgba(197,168,130,0.12)' : '#fff',
                      display: 'flex', flexDirection: 'column', gap: '2px', fontFamily: 'var(--font-inter),sans-serif',
                    }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '20px', height: '20px', borderRadius: '50%', fontSize: '11px',
                      background: isTodayCell(day) ? '#0F1E14' : 'transparent',
                      color: isTodayCell(day) ? '#F5F1EC' : '#333', fontWeight: isTodayCell(day) ? 600 : 400,
                    }}>{day}</span>
                    {dEvents.slice(0, 2).map(e => (
                      <div key={e.id} style={{ fontSize: '9.5px', color: '#8A6535', background: 'rgba(197,168,130,0.15)', borderRadius: '3px', padding: '1px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                    ))}
                    {dBdays.slice(0, 2).map((b, bi) => (
                      <div key={bi} style={{ fontSize: '9.5px', color: '#93333E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎂 {b.name}</div>
                    ))}
                    {dNotes.length > 0 && (
                      <div style={{ fontSize: '9.5px', color: '#3B6B2F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📝 {dNotes.length > 1 ? `${dNotes.length} notes` : dNotes[0].content}</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Day detail panel */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.1rem 1.25rem', position: 'sticky', top: '1rem' }}>
            {!selectedDate ? (
              <div style={{ fontSize: '12px', color: '#bbb' }}>Tap a day to see its events, birthdays, and notes.</div>
            ) : (
              <>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a', marginBottom: '0.9rem' }}>
                  {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: selectedInView ? undefined : 'numeric' })}
                </div>

                {dayEvents.length > 0 && (
                  <div style={{ marginBottom: '0.9rem' }}>
                    <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }}>Events</div>
                    {dayEvents.map(e => (
                      <div key={e.id} style={{ fontSize: '12px', color: '#333', marginBottom: '0.3rem' }}>
                        {e.name}{e.location ? <span style={{ color: '#999' }}> — {e.location}</span> : null}
                      </div>
                    ))}
                  </div>
                )}

                {dayBirthdays.length > 0 && (
                  <div style={{ marginBottom: '0.9rem' }}>
                    <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }}>Birthdays</div>
                    {dayBirthdays.map((b, i) => (
                      <div key={i} style={{ fontSize: '12px', color: '#333', marginBottom: '0.3rem' }}>🎂 {b.name}</div>
                    ))}
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.5rem' }}>Notes</div>
                  {dayNotes.length === 0 && <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '0.6rem' }}>No notes for this day yet.</div>}
                  {dayNotes.map(n => (
                    <div key={n.id} style={{ background: '#fafaf9', border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: '8px', padding: '0.6rem 0.7rem', marginBottom: '0.5rem' }}>
                      {editingNoteId === n.id ? (
                        <>
                          <textarea style={{ ...inp, height: '60px', resize: 'vertical', width: '100%' }} value={editDraft} onChange={e => setEditDraft(e.target.value)} maxLength={2000} autoFocus />
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                            <GhostBtn small onClick={() => saveEditNote(n.id)}>Save</GhostBtn>
                            <GhostBtn small onClick={() => setEditingNoteId(null)}>Cancel</GhostBtn>
                          </div>
                        </>
                      ) : deleteConfirm === n.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: '#93333E' }}>Delete this note?</span>
                          <DangerBtn small onClick={() => deleteNote(n.id)}>Delete</DangerBtn>
                          <GhostBtn small onClick={() => setDeleteConfirm(null)}>Cancel</GhostBtn>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: '12px', color: '#333', whiteSpace: 'pre-wrap', marginBottom: '0.4rem' }}>{n.content}</div>
                          <div style={{ display: 'flex', gap: '0.7rem' }}>
                            <button onClick={() => startEditNote(n)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8a7a5c', fontFamily: 'var(--font-inter),sans-serif' }}>Edit</button>
                            <button onClick={() => setDeleteConfirm(n.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#c99', fontFamily: 'var(--font-inter),sans-serif' }}>Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  <textarea style={{ ...inp, height: '54px', resize: 'vertical', width: '100%' }} value={draft} placeholder="Add a note for this day…"
                    onChange={e => setDraft(e.target.value)} maxLength={2000} />
                  <div style={{ marginTop: '0.4rem' }}>
                    <PrimaryBtn onClick={addNote} disabled={savingDraft || !draft.trim()}>{savingDraft ? 'Saving…' : '+ Add Note'}</PrimaryBtn>
                  </div>
                  <Err msg={notesErr} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 860px) {
          .cal-layout { grid-template-columns: 1fr !important; }
        }
        @media (pointer: coarse) {
          textarea { font-size: 16px !important; }
        }
      `}</style>
    </div>
  )
}
