'use client'
import { useState, useEffect, useMemo } from 'react'
import { inp, GhostBtn, PrimaryBtn, DangerBtn, Err, CopyBtn, MONTHS } from '../_components/shared'
import { observedBirthdayDay, isLeapDayBirthday } from '../../../lib/adminBirthdays'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const pad2 = (n) => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`

const FEEDS = [
  { key: 'all',       label: 'Everything',      desc: 'Events + birthdays + notes combined' },
  { key: 'events',    label: 'Events only',     desc: 'Every meet & road trip, past and future' },
  { key: 'birthdays', label: 'Birthdays only',  desc: "Everyone's birthday, every year" },
  { key: 'notes',     label: 'Notes only',      desc: 'Just what you write on this calendar' },
]

function ChevronIcon({ open }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function CalendarClient() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed
  const [events, setEvents] = useState([])
  const [birthdays, setBirthdays] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  // Defaults to today so the detail panel always has something to show
  // instead of a "tap a day" placeholder on first load.
  const [selectedDate, setSelectedDate] = useState(() => ymd(now.getFullYear(), now.getMonth(), now.getDate()))
  const [draft, setDraft] = useState('')
  const [savingDraft, setSavingDraft] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null) // note id
  const [notesErr, setNotesErr] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  const [syncOpen, setSyncOpen] = useState(false)
  const [sync, setSync] = useState(null) // { token, feeds: {...} } | null
  const [syncErr, setSyncErr] = useState(null)
  const [regenConfirm, setRegenConfirm] = useState(false)
  const [regenBusy, setRegenBusy] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
  // month/year — cheap lookup for rendering the grid cells (which only ever
  // show days from that same month). The day-detail panel below deliberately
  // does NOT use these — it filters the full lists by the exact selected
  // date instead, so picking a day and then navigating to a different month
  // can't make the panel silently show a different month's data under the
  // still-correct-looking selected-date heading.
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
      if (b.month - 1 !== month) continue
      // A raw day-29 lookup would make a Feb 29 birthday's marker simply
      // vanish in every non-leap February (no 29th cell exists to place it
      // in) — observedBirthdayDay resolves it to the 28th in those years,
      // matching what the .ics feed and the countdown widget both show.
      const day = observedBirthdayDay(b, year)
      ;(map[day] ||= []).push(b)
    }
    return map
  }, [birthdays, year, month])

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

  // Filtered directly from the exact selected date — see the comment above
  // eventsByDay for why this can't reuse the month-indexed maps.
  const dayEvents = useMemo(() => selectedDate ? events.filter(e => e.date === selectedDate) : [], [events, selectedDate])
  const dayBirthdays = useMemo(() => {
    if (!selectedDate) return []
    const [y, m, d] = selectedDate.split('-').map(Number)
    // See birthdaysByDay above — a Feb 29 birthday must match against its
    // observed day for THIS specific year, or clicking Feb 28 in a
    // non-leap year would show nothing for that person.
    return birthdays.filter(b => b.month === m && observedBirthdayDay(b, y) === d)
  }, [birthdays, selectedDate])
  const dayNotes = useMemo(() => selectedDate ? notes.filter(n => n.note_date === selectedDate) : [], [notes, selectedDate])

  return (
    <div className="cal-wrap" style={{ padding: 'clamp(1rem, 3vw, 2.5rem)' }}>
      <style>{`
        @keyframes calFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes calFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes calPanelIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes calPop { 0% { transform: scale(0.9); } 60% { transform: scale(1.06); } 100% { transform: scale(1); } }
        .cal-wrap { animation: calFadeIn 0.3s ease both; }
        .cal-grid-body { animation: calFadeUp 0.24s cubic-bezier(0.16,1,0.3,1) both; }
        .cal-sync-body { animation: calPanelIn 0.2s ease both; }
        .cal-detail-body { animation: calFadeUp 0.22s cubic-bezier(0.16,1,0.3,1) both; }
        .cal-day-dot { animation: calPop 0.25s ease both; }
        .cal-tap { min-height: 44px; }
        .cal-wrap button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .cal-daycell { transition: background 0.15s ease, transform 0.1s ease; }
        .cal-daycell:active { transform: scale(0.97); }
        @media (hover: hover) {
          .cal-daycell:hover { background: rgba(197,168,130,0.08) !important; }
          .cal-feed-row:hover { background: rgba(0,0,0,0.015); }
        }
        /* iOS zooms in when a focused input's font-size is under 16px */
        @media (pointer: coarse) {
          .cal-wrap input, .cal-wrap textarea { font-size: 16px !important; }
        }
        .cal-wrap input, .cal-wrap textarea { max-width: 100%; box-sizing: border-box; }
        @media (max-width: 860px) {
          .cal-layout { grid-template-columns: 1fr !important; }
          .cal-detail-panel { position: static !important; }
        }
        @media (max-width: 480px) {
          .cal-daycell { min-height: 56px !important; padding: 0.3rem 0.2rem !important; }
          .cal-day-num { width: 18px !important; height: 18px !important; font-size: 10px !important; }
          .cal-feed-row { flex-direction: column !important; align-items: flex-start !important; }
          .cal-feed-actions { width: 100%; }
          .cal-feed-url { max-width: none !important; flex: 1 1 auto; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cal-wrap, .cal-grid-body, .cal-sync-body, .cal-detail-body, .cal-day-dot { animation: none !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(24px, 5vw, 30px)', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em' }}>Calendar</h1>
      </div>

      {/* Sync panel — collapsed by default; tap the header to expand */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', marginBottom: '1.25rem', overflow: 'hidden' }}>
        <button onClick={() => setSyncOpen(o => !o)} className="cal-tap"
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.85rem 1.1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#1a1a1a' }}>Sync to your iPhone</div>
            {!syncOpen && <div style={{ fontSize: '10.5px', color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>4 personal links — tap to view</div>}
          </div>
          <ChevronIcon open={syncOpen} />
        </button>

        {syncOpen && (
          <div className="cal-sync-body" style={{ padding: '0 1.1rem 1.1rem' }}>
            {syncErr ? <Err msg={syncErr} /> : !sync ? (
              <div style={{ fontSize: '12px', color: '#bbb' }}>Loading your link…</div>
            ) : (
              <>
                <div style={{ fontSize: '11.5px', color: '#666', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                  These links are personal. Subscribe to "Everything" for one combined calendar, or pick any combination of the three below — iOS shows each as its own calendar in Settings → Calendar → Accounts, with its own on/off checkbox, so you can display just birthdays, just notes, or just events. It re-checks for changes roughly once or twice a day, not instantly.
                </div>

                {FEEDS.map(f => (
                  <div key={f.key} className="cal-feed-row" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', padding: '0.55rem 0.3rem', borderRadius: '8px', borderTop: f.key === 'all' ? 'none' : '0.5px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ minWidth: '130px', flex: '1 1 130px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: '#1a1a1a' }}>{f.label}</div>
                      <div style={{ fontSize: '10px', color: '#999' }}>{f.desc}</div>
                    </div>
                    <div className="cal-feed-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <a href={sync.feeds[f.key].webcalUrl} className="cal-tap"
                        style={{ display: 'inline-flex', alignItems: 'center', padding: '0 0.9rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', borderRadius: '7px', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', fontFamily: 'var(--font-inter),sans-serif' }}>
                        Subscribe
                      </a>
                      <div className="cal-feed-url" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '10.5px', color: '#888', background: '#fafaf9', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: '7px', padding: '0.4rem 0.6rem', maxWidth: '220px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '10px' }}>{sync.feeds[f.key].url}</span>
                        <CopyBtn value={sync.feeds[f.key].url} />
                      </div>
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                  {!regenConfirm ? (
                    <button onClick={() => setRegenConfirm(true)} className="cal-tap" style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '6px', color: '#999', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                      Regenerate all links
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: '#93333E' }}>All four links above stop working (including any already subscribed). Sure?</span>
                      <DangerBtn small onClick={regenerateLink} disabled={regenBusy}>{regenBusy ? '…' : 'Yes'}</DangerBtn>
                      <GhostBtn small onClick={() => setRegenConfirm(false)}>Cancel</GhostBtn>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
        <button onClick={() => changeMonth(-1)} aria-label="Previous month" className="cal-tap"
          style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '6px', width: '38px', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div key={`${year}-${month}`} style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 400, color: '#1a1a1a', minWidth: '150px', textAlign: 'center', animation: 'calFadeIn 0.2s ease both' }}>{MONTHS[month]} {year}</div>
        <button onClick={() => changeMonth(1)} aria-label="Next month" className="cal-tap"
          style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '6px', width: '38px', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <GhostBtn small onClick={goToday}>Today</GhostBtn>
      </div>

      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : (
        <div className="cal-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 340px)', gap: '1.25rem', alignItems: 'flex-start' }}>
          {/* Month grid */}
          <div key={`grid-${year}-${month}`} className="cal-grid-body" style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
              {DOW.map(d => (
                <div key={d} style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#bbb', textAlign: 'center', padding: '0.5rem 0' }}>{isMobile ? d[0] : d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
              {slots.map((day, i) => {
                if (!day) return <div key={i} style={{ minHeight: isMobile ? '56px' : '92px', borderRight: (i % 7 !== 6) ? '0.5px solid rgba(0,0,0,0.04)' : 'none', borderBottom: '0.5px solid rgba(0,0,0,0.04)', background: '#fbfbfa' }} />
                const dateStr = ymd(year, month, day)
                const dEvents = eventsByDay[day] || []
                const dBdays = birthdaysByDay[day] || []
                const dNotes = notesByDay[day] || []
                const isSelected = selectedDate === dateStr
                return (
                  <button key={i} onClick={() => setSelectedDate(dateStr)} className="cal-daycell"
                    style={{
                      minHeight: isMobile ? '56px' : '92px', textAlign: 'left', padding: isMobile ? '0.3rem 0.25rem' : '0.4rem', border: 'none', cursor: 'pointer',
                      borderRight: (i % 7 !== 6) ? '0.5px solid rgba(0,0,0,0.04)' : 'none',
                      borderBottom: '0.5px solid rgba(0,0,0,0.04)',
                      background: isSelected ? 'rgba(197,168,130,0.14)' : '#fff',
                      display: 'flex', flexDirection: 'column', gap: isMobile ? '3px' : '2px', fontFamily: 'var(--font-inter),sans-serif',
                    }}>
                    <span className="cal-day-num" style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '20px', height: '20px', borderRadius: '50%', fontSize: '11px',
                      background: isTodayCell(day) ? '#0F1E14' : 'transparent',
                      color: isTodayCell(day) ? '#F5F1EC' : '#333', fontWeight: isTodayCell(day) ? 600 : 400,
                    }}>{day}</span>

                    {isMobile ? (
                      // Compact dots instead of text pills — an iPhone 13 Pro
                      // column is ~50px wide at this grid, too narrow for
                      // readable event-name text without wrapping/overflow.
                      (dEvents.length > 0 || dBdays.length > 0 || dNotes.length > 0) && (
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '1px' }}>
                          {dEvents.length > 0 && <span className="cal-day-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#c5a882' }} />}
                          {dBdays.length > 0 && <span className="cal-day-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#93333E' }} />}
                          {dNotes.length > 0 && <span className="cal-day-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3B6B2F' }} />}
                        </div>
                      )
                    ) : (
                      <>
                        {dEvents.slice(0, 2).map(e => (
                          <div key={e.id} style={{ fontSize: '9.5px', color: '#8A6535', background: 'rgba(197,168,130,0.15)', borderRadius: '3px', padding: '1px 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                        ))}
                        {dBdays.slice(0, 2).map((b, bi) => (
                          <div key={bi} style={{ fontSize: '9.5px', color: '#93333E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🎂 {b.name}</div>
                        ))}
                        {dNotes.length > 0 && (
                          <div style={{ fontSize: '9.5px', color: '#3B6B2F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📝 {dNotes.length > 1 ? `${dNotes.length} notes` : dNotes[0].content}</div>
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Day detail panel */}
          <div className="cal-detail-panel" style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderLeft: '3px solid #c5a882', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.1rem 1.25rem', position: 'sticky', top: '1rem' }}>
            <div key={selectedDate} className="cal-detail-body">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '19px', fontWeight: 400, color: '#1a1a1a' }}>
                  {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: selectedInView ? undefined : 'numeric' })}
                </div>
                {selectedDate === ymd(now.getFullYear(), now.getMonth(), now.getDate()) && (
                  <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0F1E14', background: 'rgba(197,168,130,0.35)', borderRadius: '20px', padding: '2px 8px', fontFamily: 'var(--font-inter),sans-serif', fontWeight: 600 }}>Today</span>
                )}
              </div>

              {dayEvents.length === 0 && dayBirthdays.length === 0 && (
                <div style={{ fontSize: '11.5px', color: '#bbb', marginBottom: '1rem', fontStyle: 'italic' }}>Nothing scheduled — the day's clear.</div>
              )}

              {dayEvents.length > 0 && (
                <div style={{ marginBottom: '0.9rem' }}>
                  <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.4rem' }}>Events</div>
                  {dayEvents.map(e => (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '12px', color: '#333', marginBottom: '0.35rem' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c5a882', flexShrink: 0, marginTop: '5px' }} />
                      <span>{e.name}{e.location ? <span style={{ color: '#999' }}> — {e.location}</span> : null}</span>
                    </div>
                  ))}
                </div>
              )}

              {dayBirthdays.length > 0 && (
                <div style={{ marginBottom: '0.9rem' }}>
                  <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.4rem' }}>Birthdays</div>
                  {dayBirthdays.map((b, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '12px', color: '#333', marginBottom: '0.35rem' }}>
                      <span style={{ flexShrink: 0 }}>🎂</span>
                      <span>{b.name}{isLeapDayBirthday(b) ? <span style={{ color: '#999' }}> (leap day, observed)</span> : null}</span>
                    </div>
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
                          <div style={{ display: 'flex', gap: '0.9rem' }}>
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
              </div>
          </div>
        </div>
      )}
    </div>
  )
}
