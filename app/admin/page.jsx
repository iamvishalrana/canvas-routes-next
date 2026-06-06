'use client'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '../../lib/supabase/client'

const STATUS_OPTIONS = ['pending', 'active', 'suspended', 'expired']
const CAR_YEARS = Array.from({ length: 2027 - 1940 + 1 }, (_, i) => 2027 - i)
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DOB_YEARS = Array.from({ length: 2015 - 1945 + 1 }, (_, i) => 2015 - i)
const EMPTY_CAR = { year: '', make: '', model: '', license_plate: '' }
const STATUS_COLORS = {
  active:    { bg: 'rgba(59,107,47,0.1)',   text: '#3B6B2F', border: 'rgba(59,107,47,0.3)'   },
  pending:   { bg: 'rgba(197,168,130,0.15)', text: '#8A6535', border: 'rgba(197,168,130,0.45)' },
  suspended: { bg: 'rgba(123,32,50,0.1)',   text: '#7B2032', border: 'rgba(123,32,50,0.3)'   },
  expired:   { bg: 'rgba(0,0,0,0.05)',      text: '#999',    border: 'rgba(0,0,0,0.15)'      },
}
const EVENT_TYPES = ['Road Trip', 'Cars & Coffee', 'Social', 'Track Day', 'Other']
const CAR_MAKES = ['Acura','Alfa Romeo','Allard','Aston Martin','Audi','Bentley','BMW','Bugatti','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Ferrari','Fiat','Ford','Genesis','GMC','Honda','Hyundai','Infiniti','Isuzu','Jaguar','Jeep','Kia','Koenigsegg','Lamborghini','Land Rover','Lexus','Lincoln','Lotus','Maserati','Mazda','McLaren','Mercedes-Benz','MINI','Mitsubishi','Nissan','Pagani','Pontiac','Porsche','Ram','Rimac','Rolls-Royce','Subaru','Toyota','Volkswagen','Volvo','Zenvo','Other']
function parseCarMakeModel(combined) {
  const s = (combined || '').trim()
  if (!s) return { make: '', model: '' }
  for (const make of CAR_MAKES) {
    if (s.toLowerCase().startsWith(make.toLowerCase() + ' ')) return { make, model: s.slice(make.length).trim() }
    if (s.toLowerCase() === make.toLowerCase()) return { make, model: '' }
  }
  return { make: '', model: s }
}
const CANONICAL_EVENTS = [
  { name: 'Cars & Coffee — May 9, 2026', date: '2026-05-09' },
  { name: 'Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026', date: '2026-05-23' },
  { name: 'Into the Laurentians — June 7, 2026', date: '2026-06-07' },
]
const MEMBER_ATTENDANCE_KEYS = {
  'Cars & Coffee — May 9, 2026': 'cc_may9',
  'Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026': 'gp_may23',
  'Into the Laurentians — June 7, 2026': 'laurentians_jun7',
}
const NAME_ALIASES = {
  'Grand Prix Weekend Cars & Coffee — May 23, 2026': 'Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026',
  'Into the Laurentians — May 31, 2026': 'Into the Laurentians — June 7, 2026',
}
function normalizeEventName(name) { return NAME_ALIASES[name] || name }

const inp = {
  width: '100%', padding: '0.7rem 0.9rem',
  border: '1px solid rgba(0,0,0,0.14)', background: '#fff',
  fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const sel = { ...inp, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' }

function L({ children }) {
  return <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', marginBottom: '0.35rem' }}>{children}</div>
}

function Badge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending
  return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 9px', border: `0.5px solid ${s.border}`, background: s.bg, color: s.text, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  )
}

function SelectWrap({ value, onChange, options }) {
  return (
    <div style={{ position: 'relative' }}>
      <select style={sel} value={value} onChange={onChange}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  )
}

function PrimaryBtn({ onClick, disabled, type = 'button', children }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ padding: '0.65rem 1.4rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', cursor: disabled ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  )
}

function GhostBtn({ onClick, small, disabled, children }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ padding: small ? '0.35rem 0.8rem' : '0.65rem 1.2rem', background: 'transparent', color: '#555', border: '0.5px solid rgba(0,0,0,0.2)', fontSize: small ? '10px' : '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: disabled ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  )
}

function DangerBtn({ onClick, small, children }) {
  return (
    <button type="button" onClick={onClick}
      style={{ padding: small ? '0.35rem 0.8rem' : '0.65rem 1.2rem', background: 'transparent', color: '#7B2032', border: '0.5px solid rgba(123,32,50,0.35)', fontSize: small ? '10px' : '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
      {children}
    </button>
  )
}

function Err({ msg }) {
  if (!msg) return null
  return <div style={{ fontSize: '12px', color: '#7B2032', marginTop: '0.6rem' }}>{msg}</div>
}

function Success({ msg }) {
  if (!msg) return null
  return <div style={{ fontSize: '12px', color: '#3B6B2F', marginTop: '0.6rem' }}>{msg}</div>
}

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  function doCopy(e) {
    e.stopPropagation()
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }
  return (
    <button onClick={doCopy} title="Copy" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 3px', color: copied ? '#3B6B2F' : '#bbb', lineHeight: 1, display: 'inline-flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.15s' }}>
      {copied
        ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      }
    </button>
  )
}

// ─── Admin Notes Panel ───────────────────────────────────────────────────────

function parseAdminNotes(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return [{ id: 1, text: raw, createdAt: null }]
}

function AdminNotesPanel({ initialNotes, onSave }) {
  const [notes, setNotes] = useState(() => parseAdminNotes(initialNotes))
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  async function addNote() {
    if (!draft.trim()) return
    const updated = [...notes, { id: Date.now(), text: draft.trim(), createdAt: new Date().toISOString() }]
    setNotes(updated)
    setDraft('')
    setSaving(true)
    try {
      await onSave(JSON.stringify(updated))
      setSaveError(null)
    } catch {
      setSaveError('Failed to save note.')
    }
    setSaving(false)
  }

  async function deleteNote(id) {
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated)
    try {
      await onSave(JSON.stringify(updated))
      setSaveError(null)
    } catch {
      setSaveError('Failed to save note.')
    }
  }

  function fmt(iso) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div>
      <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.65rem' }}>Admin Notes</div>
      {notes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
          {notes.map(note => (
            <div key={note.id} style={{ background: 'rgba(0,0,0,0.03)', border: '0.5px solid rgba(0,0,0,0.07)', padding: '0.6rem 0.75rem' }}>
              <div style={{ fontSize: '12px', color: '#333', lineHeight: '1.6', marginBottom: '0.3rem', whiteSpace: 'pre-wrap' }}>{note.text}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: '#bbb' }}>{note.createdAt ? fmt(note.createdAt) : ''}</span>
                <button onClick={() => deleteNote(note.id)} style={{ background: 'none', border: 'none', padding: '0', cursor: 'pointer', fontSize: '10px', color: '#ccc', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.04em' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <textarea
        style={{ ...inp, height: '60px', resize: 'vertical' }}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder="Add a note…"
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote() }}
      />
      <div style={{ marginTop: '0.5rem' }}>
        <GhostBtn small onClick={addNote} disabled={saving || !draft.trim()}>{saving ? 'Saving…' : 'Add Note'}</GhostBtn>
      </div>
      <Err msg={saveError} />
    </div>
  )
}

// ─── Member Expanded Panel ───────────────────────────────────────────────────

function MemberExpandedPanel({ m, onToggleAttendance, isMobile, editingNote, noteValue, setEditingNote, setNoteValue, onSaveNote }) {

  const initials = (m.name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const memberSinceRaw = m.created_at || m.password_set_at
  const memberSinceStr = memberSinceRaw ? new Date(memberSinceRaw).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null
  const cars = m.cars?.length > 0 ? m.cars : (m.car_year || m.car_make || m.car_model ? [{ year: m.car_year, make: m.car_make, model: m.car_model, license_plate: m.license_plate }] : [])
  const validCars = cars.filter(c => c.year || c.make || c.model)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const pastEvents = CANONICAL_EVENTS.filter(ev => new Date(ev.date) <= today)
  const attendedCount = pastEvents.filter(ev => m.event_attendance?.[MEMBER_ATTENDANCE_KEYS[ev.name] || ev.name] === true).length
  const noShowCount = pastEvents.filter(ev => m.event_attendance?.[MEMBER_ATTENDANCE_KEYS[ev.name] || ev.name] === false).length
  const upcomingCount = CANONICAL_EVENTS.filter(ev => new Date(ev.date) > today).length
  const dobStr = m.dob_month ? `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m.dob_month - 1]} ${m.dob_day}${m.dob_year ? `, ${m.dob_year}` : ''}` : null

  const sep = { borderBottom: '0.5px solid rgba(0,0,0,0.06)' }
  const sectionPad = { padding: '1rem 1.25rem' }
  const label = { fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.6rem' }

  return (
    <div style={{ background: '#faf9f7', borderTop: '0.5px solid rgba(0,0,0,0.06)', borderLeft: '3px solid #c5a882' }}>

      {/* Header */}
      <div style={{ ...sectionPad, ...sep, display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #c5a882, #a8885f)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '13px', color: '#fff', fontFamily: 'var(--font-inter),sans-serif', fontWeight: '500', letterSpacing: '0.05em' }}>{initials}</span>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>{m.name || <span style={{ color: '#ccc', fontWeight: '400' }}>No name</span>}</span>
            <Badge status={m.membership_status} />
            {m.tier && (
              <span style={{ fontSize: '9px', letterSpacing: '0.13em', textTransform: 'uppercase', padding: '2px 7px', border: m.tier === 'inner_circle' ? '0.5px solid rgba(197,168,130,0.6)' : '0.5px solid rgba(0,0,0,0.15)', color: m.tier === 'inner_circle' ? '#c5a882' : '#999', background: m.tier === 'inner_circle' ? 'rgba(197,168,130,0.08)' : 'transparent' }}>
                {m.tier === 'inner_circle' ? 'Inner Circle' : 'Routes Member'}
              </span>
            )}
          </div>
          {memberSinceStr && <div style={{ fontSize: '11px', color: '#bbb', marginTop: '0.2rem' }}>Member since {memberSinceStr}</div>}
        </div>
      </div>

      {/* Contact */}
      {(m.email || m.phone || m.instagram || dobStr) && (
        <div style={{ ...sectionPad, ...sep, display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem', alignItems: 'center' }}>
          {m.email && (
            <a href={`mailto:${m.email}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '12px', color: '#555', textDecoration: 'none' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              {m.email}
            </a>
          )}
          {m.phone && (
            <a href={`tel:${m.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '12px', color: '#555', textDecoration: 'none' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.5 2 2 0 0 1 3.62 1.35h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              {m.phone}
            </a>
          )}
          {m.instagram && (
            <a href={`https://instagram.com/${m.instagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '12px', color: '#c5a882', textDecoration: 'none' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="#c5a882"/></svg>
              @{m.instagram.replace(/^@/, '')}
            </a>
          )}
          {dobStr && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '12px', color: '#999' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><rect x="9" y="2" width="6" height="7" rx="1"/><path d="M12 12v3"/><path d="M9 15h6"/></svg>
              {dobStr}
            </span>
          )}
          {(m.join_date || m.created_at) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '12px', color: '#999' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              Joined {new Date(m.join_date || m.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
      )}

      {/* Cars */}
      {validCars.length > 0 && (
        <div style={{ ...sectionPad, ...sep }}>
          <div style={label}>Garage</div>
          {validCars.map((car, i) => {
            const parts = [car.year, car.make, car.model].filter(Boolean)
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: i < validCars.length - 1 ? '0.4rem' : 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c5a882" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"/><rect x="11" y="13" width="10" height="8" rx="2"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="17.5" cy="17.5" r="1.5"/></svg>
                <span style={{ fontSize: '13px', color: '#1a1a1a' }}>
                  {parts.map((p, pi) => <span key={pi}>{pi > 0 && <span style={{ color: '#c5a882', margin: '0 0.35rem', fontSize: '10px' }}>·</span>}{p}</span>)}
                </span>
                {car.license_plate && (
                  <span style={{ fontSize: '10px', color: '#aaa', letterSpacing: '0.1em', textTransform: 'uppercase', border: '0.5px solid rgba(0,0,0,0.12)', padding: '1px 6px' }}>{car.license_plate}</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Photo */}
      {m.car_photo_url && (
        <div style={{ ...sectionPad, ...sep }}>
          <div style={label}>Photo</div>
          <a href={m.car_photo_url} target="_blank" rel="noreferrer">
            <img src={m.car_photo_url} alt={m.name} style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }} />
          </a>
        </div>
      )}

      {/* Event Attendance */}
      <div style={{ ...sectionPad, ...sep }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <div style={label}>Event Attendance</div>
          {pastEvents.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '11px', color: attendedCount > 0 ? '#3B6B2F' : '#bbb' }}>{attendedCount} attended</span>
              <span style={{ color: '#ddd' }}>·</span>
              <span style={{ fontSize: '11px', color: noShowCount > 0 ? '#7B2032' : '#bbb' }}>{noShowCount} no-show</span>
              {upcomingCount > 0 && <><span style={{ color: '#ddd' }}>·</span><span style={{ fontSize: '11px', color: '#bbb' }}>{upcomingCount} upcoming</span></>}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {CANONICAL_EVENTS.map(ev => {
            const key = MEMBER_ATTENDANCE_KEYS[ev.name] || ev.name
            const attended = m.event_attendance?.[key]
            const isPast = new Date(ev.date) <= today
            return (
              <div key={ev.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '12px', color: '#444', flex: 1 }}>{ev.name}</span>
                {isPast ? (
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <button onClick={() => onToggleAttendance(m, ev.name, true)}
                      style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', border: attended === true ? '0.5px solid #3B6B2F' : '0.5px solid rgba(0,0,0,0.14)', background: attended === true ? 'rgba(59,107,47,0.1)' : '#fff', color: attended === true ? '#3B6B2F' : '#aaa' }}>
                      ✓ Attended
                    </button>
                    <button onClick={() => onToggleAttendance(m, ev.name, false)}
                      style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', border: attended === false ? '0.5px solid #7B2032' : '0.5px solid rgba(0,0,0,0.14)', background: attended === false ? 'rgba(123,32,50,0.08)' : '#fff', color: attended === false ? '#7B2032' : '#aaa' }}>
                      ✗ No-show
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: '10px', color: '#ccc', letterSpacing: '0.06em' }}>Upcoming</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Note */}
      <div style={{ ...sectionPad, ...sep }}>
        <div style={label}>Quick Note</div>
        {editingNote === m.id ? (
          <div>
            <input autoFocus value={noteValue} maxLength={200}
              onChange={e => setNoteValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onSaveNote(m.id, noteValue); if (e.key === 'Escape') setEditingNote(null) }}
              style={{ ...inp, fontSize: '13px', marginBottom: '0.5rem' }}
              placeholder="e.g. Referred 3 friends, inner circle candidate" />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <GhostBtn small onClick={() => onSaveNote(m.id, noteValue)}>Save</GhostBtn>
              <GhostBtn small onClick={() => setEditingNote(null)}>Cancel</GhostBtn>
            </div>
          </div>
        ) : (
          <div onClick={() => { setEditingNote(m.id); setNoteValue(m.notes || '') }}
            style={{ fontSize: '13px', color: m.notes ? '#444' : '#ccc', cursor: 'text', padding: '0.5rem 0.75rem', border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff', minHeight: '36px' }}>
            {m.notes || 'Click to add a note…'}
          </div>
        )}
      </div>

      {/* Admin Notes */}
      <div style={sectionPad}>
        <AdminNotesPanel
          initialNotes={m.admin_notes}
          onSave={async (json) => {
            const res = await fetch(`/api/admin/members/${m.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ admin_notes: json }),
            })
            if (!res.ok) throw new Error('Failed to save notes')
          }}
        />
      </div>
    </div>
  )
}

// ─── Members Tab ─────────────────────────────────────────────────────────────

function MembersTab({ isMobile, searchOverride, onSearchOverrideConsumed }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [editing, setEditing] = useState(null)
  const [emailsCopied, setEmailsCopied] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [editCars, setEditCars] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', membership_status: 'pending', tier: 'routes_member' })
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [appData, setAppData] = useState(null)
  const [appLookupEmail, setAppLookupEmail] = useState('')
  const [actionError, setActionError] = useState(null)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [sort, setSort] = useState('newest')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingNote, setEditingNote] = useState(null)
  const [noteValue, setNoteValue] = useState('')
  const [deleteMemberConfirm, setDeleteMemberConfirm] = useState(null)
  const [deleteMemberError, setDeleteMemberError] = useState(null)
  const [resendStatus, setResendStatus] = useState({}) // { [memberId]: 'sending' | 'sent' | 'error' | errorMsg }

  useEffect(() => {
    if (searchOverride) { setSearch(searchOverride); onSearchOverrideConsumed?.() }
  }, [searchOverride])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/members')
    if (res.status === 403) { setForbidden(true); setLoading(false); return }
    const data = await res.json()
    setMembers(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function lookupApplication(email) {
    if (!email?.trim() || !email.includes('@')) { setAppData(null); return }
    const res = await fetch(`/api/admin/applications?email=${encodeURIComponent(email.trim())}`)
    const data = await res.json()
    setAppData(data)
    if (data?.name) setInviteForm(p => ({ ...p, name: p.name || data.name }))
  }

  function startEdit(m) {
    setEditing(m.id)
    setSaveError(null)
    setEditForm({
      email: m.email || '',
      membership_status: m.membership_status,
      tier: m.tier || 'routes_member',
      name: m.name || '',
      phone: m.phone || '',
      instagram: m.instagram || '',
      dob_month: m.dob_month ? String(m.dob_month) : '',
      dob_day: m.dob_day ? String(m.dob_day) : '',
      dob_year: m.dob_year ? String(m.dob_year) : '',
    })
    if (m.cars?.length > 0) {
      setEditCars(m.cars)
    } else if (m.car_year || m.car_make || m.car_model) {
      setEditCars([{ year: m.car_year || '', make: m.car_make || '', model: m.car_model || '', license_plate: '' }])
    } else {
      setEditCars([{ ...EMPTY_CAR }])
    }
  }

  function updateEditCar(idx, field, value) {
    setEditCars(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }

  async function saveEdit() {
    setSaving(true); setSaveError(null)
    const cleanCars = editCars.filter(c => c.year || c.make || c.model || c.license_plate)
    const payload = {
      ...editForm,
      dob_month: editForm.dob_month ? parseInt(editForm.dob_month) : null,
      dob_day: editForm.dob_day ? parseInt(editForm.dob_day) : null,
      dob_year: editForm.dob_year ? parseInt(editForm.dob_year) : null,
      cars: cleanCars,
      car_year: cleanCars[0]?.year || '',
      car_make: cleanCars[0]?.make || '',
      car_model: cleanCars[0]?.model || '',
    }
    const res = await fetch(`/api/admin/members/${editing}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setSaveError(d.error || 'Failed to save.'); return }
    setEditing(null)
    load()
  }

  async function deleteMember(m) {
    setDeleteMemberError(null)
    const res = await fetch(`/api/admin/members/${m.id}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json(); setDeleteMemberError(d.error || 'Failed to delete.'); return }
    setDeleteMemberConfirm(null)
    load()
  }

  async function resendInvite(m) {
    setResendStatus(p => ({ ...p, [m.id]: 'sending' }))
    const res = await fetch(`/api/admin/members/${m.id}/resend-invite`, { method: 'POST' })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) {
      setResendStatus(p => ({ ...p, [m.id]: d.error || 'Failed to resend.' }))
    } else {
      setResendStatus(p => ({ ...p, [m.id]: 'sent' }))
      setTimeout(() => setResendStatus(p => { const n = { ...p }; delete n[m.id]; return n }), 3000)
    }
  }

  async function saveMemberNote(memberId, value) {
    const trimmed = value.trim()
    await fetch(`/api/admin/members/${memberId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: trimmed || null }),
    })
    setMembers(prev => prev.map(x => x.id === memberId ? { ...x, notes: trimmed || null } : x))
    setEditingNote(null)
  }

  async function toggleMemberAttendance(m, eventName, value) {
    const key = MEMBER_ATTENDANCE_KEYS[eventName] || eventName
    const current = m.event_attendance || {}
    const newAttendance = { ...current, [key]: current[key] === value ? null : value }
    setMembers(prev => prev.map(x => x.id === m.id ? { ...x, event_attendance: newAttendance } : x))
    await fetch(`/api/admin/members/${m.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_attendance: newAttendance }),
    })
  }

  async function invite(e) {
    e.preventDefault()
    if (!inviteForm.email.trim()) { setInviteError('Email required.'); return }
    setInviting(true); setInviteError(null); setInviteSuccess(false)
    const payload = { ...inviteForm }
    if (appData) {
      if (appData.dob_month) payload.dob_month = appData.dob_month
      if (appData.dob_day) payload.dob_day = appData.dob_day
      if (appData.dob_year) payload.dob_year = appData.dob_year
      if (appData.phone) payload.phone = appData.phone
      if (appData.instagram) payload.instagram = appData.instagram
      if (appData.car_year || appData.car_model) {
        payload.cars = [{ year: appData.car_year || '', make: '', model: appData.car_model || '', license_plate: '' }]
      }
    }
    const res = await fetch('/api/admin/members', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const data = await res.json()
    setInviting(false)
    if (!res.ok) { setInviteError(data.error || 'Failed to send invite.'); return }
    setInviteSuccess(true)
    setInviteForm({ name: '', email: '', membership_status: 'pending', tier: 'routes_member' })
    setAppData(null)
    setAppLookupEmail('')
    load()
    setTimeout(() => setInviteSuccess(false), 4000)
  }

  const filtered = members
    .filter(m =>
      (statusFilter === 'all' || m.membership_status === statusFilter) &&
      (!search || [m.name, m.email, m.membership_status, m.phone].some(v => v?.toLowerCase().includes(search.toLowerCase())) || (search.replace(/\D/g,'') && m.phone?.replace(/\D/g,'').includes(search.replace(/\D/g,''))))
    )
    .sort((a, b) => {
      if (sort === 'name_az') return (a.name || '').localeCompare(b.name || '')
      if (sort === 'name_za') return (b.name || '').localeCompare(a.name || '')
      if (sort === 'oldest') return new Date(a.join_date || a.created_at) - new Date(b.join_date || b.created_at)
      return new Date(b.join_date || b.created_at) - new Date(a.join_date || a.created_at) // newest
    })

  function exportCSV() {
    const source = selected.size > 0 ? members.filter(m => selected.has(m.id)) : members
    const rows = source.map(m => ({
      Name: m.name || '',
      Email: m.email || '',
      Status: m.membership_status || '',
      Phone: m.phone || '',
      Instagram: m.instagram ? `@${m.instagram}` : '',
      Car: [m.cars?.[0]?.year || m.car_year, m.cars?.[0]?.make || m.car_make, m.cars?.[0]?.model || m.car_model].filter(Boolean).join(' '),
      'Password Set': m.password_set_at ? new Date(m.password_set_at).toLocaleDateString('en-CA') : '',
    }))
    const headers = Object.keys(rows[0] || {})
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `canvas-routes-members-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function copyEmails() {
    const source = selected.size > 0 ? members.filter(m => selected.has(m.id)) : filtered
    const emails = source.map(m => m.email).filter(Boolean).join(', ')
    navigator.clipboard?.writeText(emails).then(() => {
      setEmailsCopied(true)
      setTimeout(() => setEmailsCopied(false), 1500)
    }).catch(() => {})
  }

  const counts = { active: 0, pending: 0, suspended: 0, expired: 0 }
  members.forEach(m => { if (counts[m.membership_status] !== undefined) counts[m.membership_status]++ })

  if (forbidden) return (
    <div style={{ padding: '2rem', background: '#fff', border: '0.5px solid rgba(123,32,50,0.2)', fontSize: '13px', color: '#7B2032' }}>
      Access denied. Make sure your email is in the <code>ADMIN_EMAILS</code> environment variable.
    </div>
  )

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total', value: members.length, color: '#1a1a1a' },
          { label: 'Active', value: counts.active, color: '#3B6B2F' },
          { label: 'Pending', value: counts.pending, color: '#8A6535' },
          { label: 'Suspended', value: counts.suspended, color: '#7B2032' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.25rem 1.4rem' }}>
            <div style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: '2rem', fontWeight: '300', color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.3rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Invite */}
      <div style={{ marginBottom: '2rem', padding: '1.75rem', border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1.25rem' }}>Invite New Member</div>
        <form onSubmit={invite} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr 160px 160px auto', gap: '0.75rem', alignItems: 'end' }}>
          <div>
            <L>Full Name</L>
            <input style={inp} value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} placeholder="Name" />
          </div>
          <div>
            <L>Email *</L>
            <input style={inp} type="email" value={inviteForm.email}
              onChange={e => { setInviteForm(p => ({ ...p, email: e.target.value })); if (appData) setAppData(null) }}
              onBlur={e => lookupApplication(e.target.value)}
              placeholder="email@example.com" />
          </div>
          <div>
            <L>Initial Status</L>
            <SelectWrap value={inviteForm.membership_status} onChange={e => setInviteForm(p => ({ ...p, membership_status: e.target.value }))} options={STATUS_OPTIONS} />
          </div>
          <div>
            <L>Tier</L>
            <div style={{ position: 'relative' }}>
              <select style={sel} value={inviteForm.tier} onChange={e => setInviteForm(p => ({ ...p, tier: e.target.value }))}>
                <option value="routes_member">Routes Member</option>
                <option value="inner_circle">Inner Circle</option>
              </select>
              <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <PrimaryBtn type="submit" disabled={inviting}>{inviting ? 'Sending…' : 'Send Invite'}</PrimaryBtn>
        </form>
        {appData && (
          <div style={{ marginTop: '0.75rem', fontSize: '12px', color: '#3B6B2F', background: 'rgba(59,107,47,0.07)', border: '0.5px solid rgba(59,107,47,0.25)', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3B6B2F" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Application found — <strong>{appData.name}</strong>{appData.car_year ? ` · ${appData.car_year} ${appData.car_model}` : ''}{appData.dob_month ? ` · DOB ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][appData.dob_month - 1]} ${appData.dob_day}${appData.dob_year ? `, ${appData.dob_year}` : ''}` : ''}. Profile will be pre-populated on invite.
          </div>
        )}
        <Err msg={inviteError} />
        <Success msg={inviteSuccess ? 'Invite sent successfully.' : null} />
      </div>

      {/* Member List */}
      {actionError && <Err msg={actionError} />}

      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.6rem 1rem', background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.3)' }}>
          <span style={{ fontSize: '11px', color: '#8A6535', letterSpacing: '0.06em' }}>{selected.size} selected</span>
          <button onClick={exportCSV} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', background: 'none', border: '0.5px solid rgba(59,107,47,0.35)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>Export CSV</button>
          <button onClick={copyEmails} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: emailsCopied ? '#3B6B2F' : '#888', background: 'none', border: `0.5px solid ${emailsCopied ? 'rgba(59,107,47,0.3)' : 'rgba(0,0,0,0.15)'}`, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>{emailsCopied ? 'Copied!' : 'Copy Emails'}</button>
          <button onClick={() => setSelected(new Set())} style={{ fontSize: '10px', color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', marginLeft: 'auto' }}>Clear</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999' }}>
            {filtered.length} of {members.length} member{members.length !== 1 ? 's' : ''}
          </div>
          {members.length > 0 && selected.size === 0 && (
            <button onClick={exportCSV} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
              Export CSV
            </button>
          )}
          {members.length > 0 && selected.size === 0 && (
            <button onClick={copyEmails} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: emailsCopied ? '#3B6B2F' : '#888', background: 'none', border: `0.5px solid ${emailsCopied ? 'rgba(59,107,47,0.3)' : 'rgba(0,0,0,0.15)'}`, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
              {emailsCopied ? 'Copied!' : 'Copy Emails'}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: isMobile ? '100%' : undefined }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ ...sel, width: '130px', fontSize: '11px', padding: '0.62rem 2rem 0.62rem 0.75rem' }}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
            </select>
            <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <select value={sort} onChange={e => setSort(e.target.value)}
              style={{ ...sel, width: '150px', fontSize: '11px', padding: '0.62rem 2rem 0.62rem 0.75rem' }}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name_az">Name A → Z</option>
              <option value="name_za">Name Z → A</option>
            </select>
            <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div style={{ position: 'relative', width: isMobile ? '100%' : '260px' }}>
            <input style={{ ...inp, width: '100%', paddingRight: search ? '2rem' : undefined }} placeholder="Search name, email, status…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '16px', lineHeight: 1, padding: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>×</button>}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : (
        <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff' }}>
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '28px 1.4fr 1.5fr 0.9fr 1fr 0.85fr 0.85fr 0.85fr', padding: '0.65rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf9', alignItems: 'center' }}>
              <input type="checkbox"
                checked={filtered.length > 0 && filtered.every(m => selected.has(m.id))}
                ref={el => { if (el) el.indeterminate = filtered.some(m => selected.has(m.id)) && !filtered.every(m => selected.has(m.id)) }}
                onChange={e => {
                  if (e.target.checked) setSelected(prev => new Set([...prev, ...filtered.map(m => m.id)]))
                  else setSelected(prev => { const n = new Set(prev); filtered.forEach(m => n.delete(m.id)); return n })
                }}
                style={{ cursor: 'pointer', accentColor: '#7B2032', width: '13px', height: '13px' }}
              />
              {['Name', 'Email', 'Status', 'Car', 'Joined', 'Setup', ''].map((h, i) => (
                <div key={i} style={{ fontSize: '10px', letterSpacing: '0.13em', textTransform: 'uppercase', color: '#999' }}>{h}</div>
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>
              {search ? (
                <span>No members match "{search}" — <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c5a882', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', padding: 0 }}>clear search</button></span>
              ) : 'No members yet.'}
            </div>
          )}

          {filtered.map((m, idx) => (
            <div key={m.id} style={{ borderBottom: idx < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
              {editing === m.id ? (
                <div style={{ padding: '1.5rem 1.25rem', background: 'rgba(197,168,130,0.05)', borderLeft: '2px solid #c5a882' }}>

                  {/* Email + Status + Tier row */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 160px 160px', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <L>Email (changes login email)</L>
                      <input style={inp} type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div>
                      <L>Status</L>
                      <SelectWrap value={editForm.membership_status} onChange={e => setEditForm(p => ({ ...p, membership_status: e.target.value }))} options={STATUS_OPTIONS} />
                    </div>
                    <div>
                      <L>Tier</L>
                      <div style={{ position: 'relative' }}>
                        <select style={sel} value={editForm.tier || 'routes_member'} onChange={e => setEditForm(p => ({ ...p, tier: e.target.value }))}>
                          <option value="routes_member">Routes Member</option>
                          <option value="inner_circle">Inner Circle</option>
                        </select>
                        <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </div>
                  </div>

                  {/* Personal info row */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div><L>Name</L><input style={inp} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
                    <div><L>Phone</L><input style={inp} type="tel" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} /></div>
                    <div><L>Instagram</L><input style={inp} value={editForm.instagram} onChange={e => setEditForm(p => ({ ...p, instagram: e.target.value }))} placeholder="@handle" /></div>
                  </div>

                  {/* DOB row */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 3fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div>
                      <L>DOB Month</L>
                      <div style={{ position: 'relative' }}>
                        <select style={{ ...sel }} value={editForm.dob_month} onChange={e => setEditForm(p => ({ ...p, dob_month: e.target.value }))}>
                          <option value="">Month</option>
                          {MONTHS.map((mo, i) => <option key={i+1} value={String(i+1)}>{mo}</option>)}
                        </select>
                        <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </div>
                    <div>
                      <L>DOB Day</L>
                      <div style={{ position: 'relative' }}>
                        <select style={sel} value={editForm.dob_day} onChange={e => setEditForm(p => ({ ...p, dob_day: e.target.value }))}>
                          <option value="">Day</option>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={String(d)}>{d}</option>)}
                        </select>
                        <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </div>
                    <div>
                      <L>DOB Year</L>
                      <div style={{ position: 'relative' }}>
                        <select style={sel} value={editForm.dob_year} onChange={e => setEditForm(p => ({ ...p, dob_year: e.target.value }))}>
                          <option value="">Year</option>
                          {DOB_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                        </select>
                        <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </div>
                  </div>

                  {/* Cars */}
                  <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', marginBottom: '0.75rem' }}>Cars ({editCars.length}/5)</div>
                  {editCars.map((car, cidx) => (
                    <div key={cidx} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '100px 1fr 1fr 120px auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'end' }}>
                      <div>
                        {cidx === 0 && <L>Year</L>}
                        <div style={{ position: 'relative' }}>
                          <select style={sel} value={car.year} onChange={e => updateEditCar(cidx, 'year', e.target.value)}>
                            <option value="">Year</option>
                            {CAR_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                          </select>
                          <svg style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                      </div>
                      <div>
                        {cidx === 0 && <L>Make</L>}
                        <input style={inp} value={car.make} onChange={e => updateEditCar(cidx, 'make', e.target.value)} placeholder="Make" />
                      </div>
                      <div>
                        {cidx === 0 && <L>Model</L>}
                        <input style={inp} value={car.model} onChange={e => updateEditCar(cidx, 'model', e.target.value)} placeholder="Model" />
                      </div>
                      <div>
                        {cidx === 0 && <L>Plate</L>}
                        <input style={{ ...inp, textTransform: 'uppercase' }} value={car.license_plate} onChange={e => updateEditCar(cidx, 'license_plate', e.target.value)} placeholder="ABC-123" maxLength={15} />
                      </div>
                      <div style={{ paddingBottom: '2px' }}>
                        {cidx === 0 && <div style={{ marginBottom: '0.35rem', height: '14px' }} />}
                        <button type="button" onClick={() => setEditCars(prev => prev.length === 1 ? [{ ...EMPTY_CAR }] : prev.filter((_, i) => i !== cidx))}
                          style={{ padding: '0.5rem 0.6rem', background: 'transparent', border: '0.5px solid rgba(123,32,50,0.25)', color: '#7B2032', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-inter),sans-serif', lineHeight: 1 }}>✕</button>
                      </div>
                    </div>
                  ))}
                  {editCars.length < 5 && (
                    <button type="button" onClick={() => setEditCars(p => [...p, { ...EMPTY_CAR }])}
                      style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', background: 'none', border: '0.5px solid rgba(59,107,47,0.4)', padding: '0.4rem 0.8rem', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '1rem' }}>
                      + Add Car
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <PrimaryBtn onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</PrimaryBtn>
                    <GhostBtn onClick={() => setEditing(null)}>Cancel</GhostBtn>
                  </div>
                  <Err msg={saveError} />
                </div>
              ) : (
                <>
                  {isMobile ? (
                    <div style={{ padding: '0.9rem 1rem', cursor: 'pointer' }} onClick={() => setExpanded(expanded === m.id ? null : m.id)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', minWidth: 0 }}>
                          <div onClick={e => e.stopPropagation()}>
                            <input type="checkbox"
                              checked={selected.has(m.id)}
                              onChange={e => setSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(m.id) : n.delete(m.id); return n })}
                              style={{ cursor: 'pointer', accentColor: '#7B2032', width: '13px', height: '13px' }}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '500' }}>{m.name || <span style={{ color: '#ccc', fontWeight: '400' }}>No name</span>}</div>
                            {m.notes && <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', marginTop: '1px' }}>{m.notes}</div>}
                          </div>
                          <Badge status={m.membership_status} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                          <GhostBtn onClick={() => startEdit(m)} small>Edit</GhostBtn>
                          <DangerBtn onClick={() => setDeleteMemberConfirm(m.id)} small>Del</DangerBtn>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.25rem' }}>{m.email}</div>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: '#888' }}>
                          {m.cars?.length > 0
                            ? [m.cars[0].year, m.cars[0].make, m.cars[0].model].filter(Boolean).join(' ') || '—'
                            : [m.car_year, m.car_make, m.car_model].filter(Boolean).join(' ') || '—'}
                          {m.cars?.length > 1 && <span style={{ fontSize: '10px', color: '#c5a882', marginLeft: '0.3rem' }}>+{m.cars.length - 1}</span>}
                        </span>
                        <span style={{ fontSize: '11px', color: m.password_set_at ? '#3B6B2F' : '#bbb' }}>
                          {m.password_set_at ? `✓ ${new Date(m.password_set_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}` : 'Awaiting'}
                        </span>
                        {!m.password_set_at && (() => {
                          const rs = resendStatus[m.id]
                          return (
                            <button
                              onClick={e => { e.stopPropagation(); if (!rs || rs === 'error') resendInvite(m) }}
                              disabled={rs === 'sending' || rs === 'sent'}
                              style={{ background: 'none', border: 'none', cursor: rs === 'sending' || rs === 'sent' ? 'default' : 'pointer', fontSize: '10px', color: rs === 'sent' ? '#3B6B2F' : typeof rs === 'string' && rs !== 'sending' ? '#7B2032' : '#c5a882', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', padding: 0 }}>
                              {rs === 'sending' ? 'Sending…' : rs === 'sent' ? '✓ Sent' : typeof rs === 'string' ? 'Retry' : 'Resend'}
                            </button>
                          )
                        })()}
                        {(m.join_date || m.created_at) && (
                          <span style={{ fontSize: '11px', color: '#bbb' }}>
                            Joined {new Date(m.join_date || m.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                  <div
                    style={{ display: 'grid', gridTemplateColumns: '28px 1.4fr 1.5fr 0.9fr 1fr 0.85fr 0.85fr 0.85fr', padding: '0.9rem 1.25rem', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                  >
                    <div onClick={e => e.stopPropagation()}>
                      <input type="checkbox"
                        checked={selected.has(m.id)}
                        onChange={e => setSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(m.id) : n.delete(m.id); return n })}
                        style={{ cursor: 'pointer', accentColor: '#7B2032', width: '13px', height: '13px' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{m.name || <span style={{ color: '#ccc' }}>No name</span>}</div>
                      {m.notes && <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', marginTop: '2px' }}>{m.notes}</div>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{m.email}</div>
                    <div><Badge status={m.membership_status} /></div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {m.cars?.length > 0
                        ? [m.cars[0].year, m.cars[0].make, m.cars[0].model].filter(Boolean).join(' ') || <span style={{ color: '#ddd' }}>—</span>
                        : [m.car_year, m.car_make, m.car_model].filter(Boolean).join(' ') || <span style={{ color: '#ddd' }}>—</span>
                      }
                      {m.cars?.length > 1 && <span style={{ fontSize: '10px', color: '#c5a882', marginLeft: '0.4rem' }}>+{m.cars.length - 1}</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#bbb' }}>
                      {(m.join_date || m.created_at) ? new Date(m.join_date || m.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </div>
                    <div>
                      {m.password_set_at ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3B6B2F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          <span style={{ fontSize: '11px', color: '#3B6B2F' }}>{new Date(m.password_set_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: '#bbb', letterSpacing: '0.05em' }}>Awaiting</span>
                          {(() => {
                            const rs = resendStatus[m.id]
                            return (
                              <button
                                onClick={e => { e.stopPropagation(); if (!rs || rs === 'error') resendInvite(m) }}
                                disabled={rs === 'sending' || rs === 'sent'}
                                style={{ background: 'none', border: 'none', cursor: rs === 'sending' || rs === 'sent' ? 'default' : 'pointer', fontSize: '10px', color: rs === 'sent' ? '#3B6B2F' : typeof rs === 'string' && rs !== 'sending' ? '#7B2032' : '#c5a882', fontFamily: 'var(--font-inter),sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', padding: 0 }}>
                                {rs === 'sending' ? 'Sending…' : rs === 'sent' ? '✓ Sent' : typeof rs === 'string' ? 'Retry' : 'Resend'}
                              </button>
                            )
                          })()}
                          {typeof resendStatus[m.id] === 'string' && resendStatus[m.id] !== 'sending' && resendStatus[m.id] !== 'sent' && (
                            <span style={{ fontSize: '10px', color: '#7B2032' }}>{resendStatus[m.id]}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }} onClick={e => e.stopPropagation()}>
                      <GhostBtn onClick={() => startEdit(m)} small>Edit</GhostBtn>
                      <DangerBtn onClick={() => setDeleteMemberConfirm(m.id)} small>Delete</DangerBtn>
                    </div>
                  </div>
                  )}

                  {expanded === m.id && (
                    <MemberExpandedPanel m={m} onToggleAttendance={toggleMemberAttendance} isMobile={isMobile}
                      editingNote={editingNote} noteValue={noteValue} setEditingNote={setEditingNote} setNoteValue={setNoteValue} onSaveNote={saveMemberNote} />
                  )}
                  {deleteMemberConfirm === m.id && (
                    <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(123,32,50,0.04)', borderTop: '0.5px solid rgba(123,32,50,0.1)' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: '#7B2032' }}>Delete {m.name || m.email}? This permanently removes them.</span>
                        <GhostBtn small onClick={() => deleteMember(m)}>Confirm</GhostBtn>
                        <GhostBtn small onClick={() => { setDeleteMemberConfirm(null); setDeleteMemberError(null) }}>Cancel</GhostBtn>
                      </div>
                      {deleteMemberError && <Err msg={deleteMemberError} />}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Announcements Tab ────────────────────────────────────────────────────────

function AnnouncementsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', content: '', published: false, audience: 'all' })
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [publishing, setPublishing] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [announcementSearch, setAnnouncementSearch] = useState('')
  const [announcementFilter, setAnnouncementFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/announcements')
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function post(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) { setPostError('Title and content required.'); return }
    setPosting(true); setPostError(null)
    const res = await fetch('/api/admin/announcements', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    const data = await res.json()
    setPosting(false)
    if (!res.ok) { setPostError(data.error || 'Failed.'); return }
    setForm({ title: '', content: '', published: false, audience: 'all' })
    load()
  }

  async function togglePublish(item) {
    if (publishing === item.id) return
    setPublishing(item.id)
    await fetch(`/api/admin/announcements/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: !item.published }),
    })
    setPublishing(null)
    load()
  }

  async function saveEdit() {
    setSaving(true); setSaveError(null)
    const res = await fetch(`/api/admin/announcements/${editing}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setSaveError(d.error || 'Failed to save.'); return }
    setEditing(null)
    load()
  }

  async function del(id) {
    setDeleteError(null)
    const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
    if (!res.ok) { setDeleteError('Failed to delete announcement.'); return }
    setDeleteConfirm(null)
    load()
  }

  const filteredAnnouncements = items.filter(a => {
    const matchesSearch = !announcementSearch || a.title.toLowerCase().includes(announcementSearch.toLowerCase()) || a.content.toLowerCase().includes(announcementSearch.toLowerCase())
    const matchesFilter = announcementFilter === 'all' || (announcementFilter === 'published' ? a.published : !a.published)
    return matchesSearch && matchesFilter
  })

  return (
    <div>
      <div style={{ marginBottom: '2rem', padding: '1.75rem', border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1.25rem' }}>New Announcement</div>
        <form onSubmit={post}>
          <div style={{ marginBottom: '0.75rem' }}>
            <L>Title</L>
            <input style={inp} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Announcement title" maxLength={200} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <L>Content</L>
            <textarea style={{ ...inp, height: '100px', resize: 'vertical' }} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Write your announcement here…" />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <L>Audience</L>
            <div style={{ position: 'relative', width: '200px' }}>
              <select style={sel} value={form.audience} onChange={e => setForm(p => ({ ...p, audience: e.target.value }))}>
                <option value="all">Everyone</option>
                <option value="members">Members only</option>
                <option value="contacts">Contacts only</option>
              </select>
              <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '12px', color: '#555' }}>
              <input type="checkbox" checked={form.published} onChange={e => setForm(p => ({ ...p, published: e.target.checked }))} />
              Publish immediately
            </label>
            <PrimaryBtn type="submit" disabled={posting}>{posting ? 'Posting…' : 'Post'}</PrimaryBtn>
          </div>
          <Err msg={postError} />
        </form>
      </div>

      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
          <input style={{ ...inp, maxWidth: '260px' }} placeholder="Search announcements…" value={announcementSearch} onChange={e => setAnnouncementSearch(e.target.value)} />
          <div style={{ position: 'relative' }}>
            <select style={{ ...sel, width: 'auto', paddingRight: '2rem' }} value={announcementFilter} onChange={e => setAnnouncementFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No announcements yet.</div>
      ) : filteredAnnouncements.length === 0 ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No announcements match your search.</div>
      ) : (
        <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff' }}>
          {filteredAnnouncements.map((item, idx) => (
            <div key={item.id} style={{ padding: '1.5rem', borderBottom: idx < filteredAnnouncements.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
              {editing === item.id ? (
                <div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <L>Title</L>
                    <input style={inp} value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <L>Content</L>
                    <textarea style={{ ...inp, height: '90px', resize: 'vertical' }} value={editForm.content} onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <L>Audience</L>
                    <div style={{ position: 'relative', width: '200px' }}>
                      <select style={sel} value={editForm.audience || 'all'} onChange={e => setEditForm(p => ({ ...p, audience: e.target.value }))}>
                        <option value="all">Everyone</option>
                        <option value="members">Members only</option>
                        <option value="contacts">Contacts only</option>
                      </select>
                      <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <PrimaryBtn onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</PrimaryBtn>
                    <GhostBtn onClick={() => setEditing(null)}>Cancel</GhostBtn>
                  </div>
                  <Err msg={saveError} />
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#1a1a1a' }}>{item.title}</div>
                      <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', border: item.published ? '0.5px solid rgba(59,107,47,0.3)' : '0.5px solid rgba(0,0,0,0.12)', background: item.published ? 'rgba(59,107,47,0.08)' : 'transparent', color: item.published ? '#3B6B2F' : '#bbb' }}>
                        {item.published ? 'Published' : 'Draft'}
                      </span>
                      {item.audience && item.audience !== 'all' && (
                        <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', border: '0.5px solid rgba(197,168,130,0.45)', background: 'rgba(197,168,130,0.1)', color: '#8A6535' }}>
                          {item.audience === 'members' ? 'Members only' : 'Contacts only'}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>{item.content}</div>
                    <div style={{ fontSize: '11px', color: '#ccc', marginTop: '0.5rem' }}>
                      {new Date(item.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <GhostBtn onClick={() => togglePublish(item)} small disabled={publishing === item.id}>{publishing === item.id ? '…' : item.published ? 'Unpublish' : 'Publish'}</GhostBtn>
                    <GhostBtn onClick={() => { setEditing(item.id); setEditForm({ title: item.title, content: item.content, audience: item.audience || 'all' }); setSaveError(null) }} small>Edit</GhostBtn>
                    <DangerBtn small onClick={() => setDeleteConfirm(item.id)}>Delete</DangerBtn>
                  </div>
                </div>
              )}
              {deleteConfirm === item.id && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: '#7B2032' }}>Delete this announcement?</span>
                  <GhostBtn small onClick={() => del(item.id)}>Confirm</GhostBtn>
                  <GhostBtn small onClick={() => setDeleteConfirm(null)}>Cancel</GhostBtn>
                </div>
              )}
              {deleteConfirm === item.id && deleteError && <Err msg={deleteError} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Events Tab ───────────────────────────────────────────────────────────────

function EventsTab({ isMobile }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', date: '', location: '', description: '', type: 'Road Trip', registration_url: '' })
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [showRegistrants, setShowRegistrants] = useState(null)
  const [registrantsData, setRegistrantsData] = useState({})
  const [loadingRegistrants, setLoadingRegistrants] = useState(false)
  const [deleteEventConfirm, setDeleteEventConfirm] = useState(null)
  const [deleteEventError, setDeleteEventError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/events')
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function post(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.date.trim()) { setPostError('Name and date required.'); return }
    setPosting(true); setPostError(null)
    const res = await fetch('/api/admin/events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    const data = await res.json()
    setPosting(false)
    if (!res.ok) { setPostError(data.error || 'Failed.'); return }
    setForm({ name: '', date: '', location: '', description: '', type: 'Road Trip', registration_url: '' })
    load()
  }

  async function saveEdit() {
    setSaving(true); setSaveError(null)
    const res = await fetch(`/api/admin/events/${editing}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setSaveError(d.error || 'Failed to save.'); return }
    setEditing(null)
    load()
  }

  async function del(id) {
    setDeleteEventError(null)
    const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
    if (!res.ok) { setDeleteEventError('Failed to delete event.'); return }
    setDeleteEventConfirm(null)
    load()
  }

  async function toggleRegistrants(eventName) {
    if (showRegistrants === eventName) { setShowRegistrants(null); return }
    setShowRegistrants(eventName)
    if (registrantsData[eventName]) return
    setLoadingRegistrants(true)
    const [mRes, cRes] = await Promise.all([fetch('/api/admin/members'), fetch('/api/admin/contacts')])
    const members = mRes.ok ? await mRes.json() : []
    const contacts = cRes.ok ? await cRes.json() : []
    const key = MEMBER_ATTENDANCE_KEYS[eventName]
    const memberRegs = (Array.isArray(members) ? members : [])
      .filter(m => {
        if (!key) return false
        const att = m.event_attendance?.[key]
        return att === true || att === 'attended'
      })
      .map(m => ({ name: m.name, email: m.email, phone: m.phone, type: 'Member' }))
    const contactRegs = (Array.isArray(contacts) ? contacts : [])
      .filter(c => (c.registrations || []).some(r => normalizeEventName(r.event) === eventName))
      .map(c => ({ name: c.name, email: c.email, phone: c.phone, type: 'Contact' }))
    const seen = new Set()
    const combined = [...memberRegs, ...contactRegs].filter(r => {
      const k = (r.email || r.name || '').toLowerCase()
      if (seen.has(k)) return false
      seen.add(k); return true
    })
    setRegistrantsData(prev => ({ ...prev, [eventName]: combined }))
    setLoadingRegistrants(false)
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem', padding: '1.75rem', border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1.25rem' }}>New Event</div>
        <form onSubmit={post}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr 150px', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <L>Event Name *</L>
              <input style={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Into the Laurentians" maxLength={200} />
            </div>
            <div>
              <L>Date *</L>
              <input style={inp} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} placeholder="May 31, 2026" />
            </div>
            <div>
              <L>Type *</L>
              <SelectWrap value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} options={EVENT_TYPES} />
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <L>Location</L>
            <input style={inp} value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Montreal → Mont-Tremblant" />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <L>Description</L>
            <textarea style={{ ...inp, height: '80px', resize: 'vertical' }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description shown to members…" />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <L>Registration URL (optional — adds a Register button for members)</L>
            <input style={inp} value={form.registration_url} onChange={e => setForm(p => ({ ...p, registration_url: e.target.value }))} placeholder="https://canvasroutes.com/routes" />
          </div>
          <PrimaryBtn type="submit" disabled={posting}>{posting ? 'Adding…' : 'Add Event'}</PrimaryBtn>
          <Err msg={postError} />
        </form>
      </div>

      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No events yet.</div>
      ) : (
        <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff' }}>
          {items.map((item, idx) => (
            <div key={item.id} style={{ padding: '1.5rem', borderBottom: idx < items.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
              {editing === item.id ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr 150px', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div><L>Name</L><input style={inp} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
                    <div><L>Date</L><input style={inp} value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} /></div>
                    <div><L>Type</L><SelectWrap value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))} options={EVENT_TYPES} /></div>
                  </div>
                  <div style={{ marginBottom: '0.6rem' }}><L>Location</L><input style={inp} value={editForm.location || ''} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} /></div>
                  <div style={{ marginBottom: '0.6rem' }}><L>Description</L><textarea style={{ ...inp, height: '80px', resize: 'vertical' }} value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></div>
                  <div style={{ marginBottom: '0.75rem' }}><L>Registration URL</L><input style={inp} value={editForm.registration_url || ''} onChange={e => setEditForm(p => ({ ...p, registration_url: e.target.value }))} placeholder="https://canvasroutes.com/routes" /></div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <PrimaryBtn onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</PrimaryBtn>
                    <GhostBtn onClick={() => setEditing(null)}>Cancel</GhostBtn>
                  </div>
                  <Err msg={saveError} />
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#1a1a1a' }}>{item.name}</div>
                        <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A6535', border: '0.5px solid rgba(197,168,130,0.45)', padding: '2px 7px' }}>{item.type}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#c5a882', fontWeight: '500', marginBottom: '0.25rem' }}>{item.date}</div>
                      {item.location && <div style={{ fontSize: '12px', color: '#888' }}>{item.location}</div>}
                      {item.description && <div style={{ fontSize: '12px', color: '#777', marginTop: '0.3rem', lineHeight: '1.55' }}>{item.description}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, flexWrap: 'wrap' }}>
                      <GhostBtn onClick={() => toggleRegistrants(item.name)} small>{showRegistrants === item.name ? 'Hide' : 'Registrants'}</GhostBtn>
                      <GhostBtn onClick={() => { setEditing(item.id); setEditForm({ name: item.name, date: item.date, location: item.location || '', description: item.description || '', type: item.type, registration_url: item.registration_url || '' }); setSaveError(null) }} small>Edit</GhostBtn>
                      <DangerBtn small onClick={() => setDeleteEventConfirm(item.id)}>Delete</DangerBtn>
                    </div>
                  </div>
                  {deleteEventConfirm === item.id && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: '#7B2032' }}>Delete this event?</span>
                      <GhostBtn small onClick={() => del(item.id)}>Confirm</GhostBtn>
                      <GhostBtn small onClick={() => { setDeleteEventConfirm(null); setDeleteEventError(null) }}>Cancel</GhostBtn>
                      {deleteEventError && <Err msg={deleteEventError} />}
                    </div>
                  )}
                  {showRegistrants === item.name && (
                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.6rem' }}>Registrants</div>
                      {loadingRegistrants && !registrantsData[item.name] ? (
                        <div style={{ fontSize: '12px', color: '#ccc' }}>Loading…</div>
                      ) : !registrantsData[item.name] || registrantsData[item.name].length === 0 ? (
                        <div style={{ fontSize: '12px', color: '#ccc' }}>No registrants on record.</div>
                      ) : isMobile ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {registrantsData[item.name].map((r, ri) => (
                              <div key={ri} style={{ padding: '0.6rem 0.75rem', border: '0.5px solid rgba(0,0,0,0.07)', background: '#fafaf9' }}>
                                <div style={{ fontSize: '12px', color: '#333', fontWeight: '500', marginBottom: '0.15rem' }}>{r.name || '—'}</div>
                                <div style={{ fontSize: '11px', color: '#666', marginBottom: '0.1rem' }}>{r.email || '—'}</div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                  <span style={{ fontSize: '11px', color: '#888' }}>{r.phone || '—'}</span>
                                  <span style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: r.type === 'Member' ? '#3B6B2F' : '#8A6535' }}>{r.type}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', minWidth: '480px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 80px', padding: '0.5rem 0.85rem', background: '#fafaf9', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                              {['Name', 'Email', 'Phone', 'Type'].map(h => (
                                <div key={h} style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb' }}>{h}</div>
                              ))}
                            </div>
                            {registrantsData[item.name].map((r, ri) => (
                              <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 80px', padding: '0.55rem 0.85rem', borderBottom: ri < registrantsData[item.name].length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none', alignItems: 'center' }}>
                                <div style={{ fontSize: '12px', color: '#333' }}>{r.name || '—'}</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>{r.email || '—'}</div>
                                <div style={{ fontSize: '12px', color: '#888' }}>{r.phone || '—'}</div>
                                <div style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: r.type === 'Member' ? '#3B6B2F' : '#8A6535' }}>{r.type}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Shared Admin Notes component for Applications / Contacts ────────────────

function AppAdminNotes({ appId, initialNotes, onSaved }) {
  return (
    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
      <AdminNotesPanel
        initialNotes={initialNotes}
        onSave={async (json) => {
          await fetch(`/api/admin/applications/${appId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_notes: json }),
          })
          onSaved?.(json)
        }}
      />
    </div>
  )
}

// ─── Applications Tab ────────────────────────────────────────────────────────

const APP_SOURCES = ['Instagram', 'Facebook', 'Friend / Word of mouth', 'Google', 'Other']

function ApplicationsTab({ isMobile, onUnseenCountChange }) {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [inviting, setInviting] = useState(null)
  const [inviteStatus, setInviteStatus] = useState({})
  const [expanded, setExpanded] = useState(null)
  const [editingApp, setEditingApp] = useState(null)
  const [editAppForm, setEditAppForm] = useState({})
  const [savingApp, setSavingApp] = useState(false)
  const [saveAppErr, setSaveAppErr] = useState(null)
  const [seenAppIds, setSeenAppIds] = useState(new Set())
  const seenInitRef = useRef(false)
  const [addingContact, setAddingContact] = useState(new Set())
  const [sortApps, setSortApps] = useState('newest')
  const [emailsCopied, setEmailsCopied] = useState(false)
  const [appTierPick, setAppTierPick] = useState(null)
  const [deleteAppConfirm, setDeleteAppConfirm] = useState(null)
  const [deleteAppError, setDeleteAppError] = useState(null)
  const [showFilter, setShowFilter] = useState('all') // 'all' | 'unseen' | 'pending'

  const loadApps = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/applications')
      .then(r => r.json())
      .then(data => { setApps(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  useEffect(() => { loadApps() }, [loadApps])

  useEffect(() => {
    if (loading || seenInitRef.current) return
    seenInitRef.current = true
    try {
      const stored = localStorage.getItem('admin_seen_app_ids')
      if (stored === null) {
        const allIds = apps.map(a => a.id)
        localStorage.setItem('admin_seen_app_ids', JSON.stringify(allIds))
        setSeenAppIds(new Set(allIds))
      } else {
        setSeenAppIds(new Set(JSON.parse(stored)))
      }
    } catch {}
  }, [loading, apps])

  function markSeen(appId) {
    setSeenAppIds(prev => {
      if (prev.has(appId)) return prev
      const next = new Set([...prev, appId])
      try { localStorage.setItem('admin_seen_app_ids', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  async function deleteApp(app) {
    setDeleteAppError(null)
    const res = await fetch(`/api/admin/applications/${app.id}`, { method: 'DELETE' })
    if (res.ok) { setDeleteAppConfirm(null); setExpanded(null); setEditingApp(null); loadApps() }
    else setDeleteAppError('Failed to delete.')
  }

  function startEditApp(a) {
    setEditingApp(a.id)
    setSaveAppErr(null)
    const { make: aMake, model: aModel } = parseCarMakeModel(a.car_model)
    setEditAppForm({
      name: a.name || '',
      car_year: a.car_year || '',
      car_make: aMake,
      car_model: aModel,
      phone: a.phone || '',
      instagram: a.instagram || '',
      dob_month: a.dob_month ? String(a.dob_month) : '',
      dob_day: a.dob_day ? String(a.dob_day) : '',
      dob_year: a.dob_year ? String(a.dob_year) : '',
      source: a.source || '',
      more: a.more || '',
    })
  }

  async function saveApp(appId) {
    setSavingApp(true); setSaveAppErr(null)
    const payload = {
      ...editAppForm,
      car_model: [editAppForm.car_make, editAppForm.car_model].filter(Boolean).join(' '),
      dob_month: editAppForm.dob_month ? parseInt(editAppForm.dob_month) : null,
      dob_day: editAppForm.dob_day ? parseInt(editAppForm.dob_day) : null,
      dob_year: editAppForm.dob_year ? parseInt(editAppForm.dob_year) : null,
    }
    const res = await fetch(`/api/admin/applications/${appId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    setSavingApp(false)
    if (!res.ok) { const d = await res.json(); setSaveAppErr(d.error || 'Failed to save.'); return }
    setApps(prev => prev.map(a => a.id === appId ? { ...a, ...payload } : a))
    setEditingApp(null)
  }

  async function toggleAttended(appId, eventName, value) {
    const app = apps.find(a => a.id === appId)
    if (!app) return
    const existing = app.registrations || []
    const idx = existing.findIndex(r => r.event === eventName)
    let newRegs
    if (idx !== -1) {
      newRegs = existing.map((r, i) =>
        i === idx ? { ...r, attended: r.attended === value ? null : value } : r
      )
    } else {
      newRegs = [...existing, { event: eventName, registered_at: null, attended: value }]
    }
    const res = await fetch(`/api/admin/applications/${appId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registrations: newRegs }),
    })
    if (res.ok) setApps(prev => prev.map(a => a.id === appId ? { ...a, registrations: newRegs } : a))
  }

  async function sendInvite(app, tier = 'routes_member') {
    setInviting(app.id)
    setAppTierPick(null)
    const payload = {
      name: app.name, email: app.email, membership_status: 'pending', tier,
      dob_month: app.dob_month || null, dob_day: app.dob_day || null, dob_year: app.dob_year || null,
      phone: app.phone || null, instagram: app.instagram || null,
      cars: (app.car_year || app.car_model)
        ? [{ year: app.car_year || '', make: '', model: app.car_model || '', license_plate: '' }]
        : undefined,
    }
    const res = await fetch('/api/admin/members', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const data = await res.json()
    setInviting(null)
    if (res.ok) {
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, is_member: true } : a))
      setInviteStatus(p => ({ ...p, [app.id]: 'success' }))
    } else {
      setInviteStatus(p => ({ ...p, [app.id]: data.error || 'Failed.' }))
    }
  }

  async function addToContact(appId) {
    setAddingContact(prev => new Set([...prev, appId]))
    const res = await fetch('/api/admin/contacts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ application_id: appId })
    })
    setAddingContact(prev => { const n = new Set(prev); n.delete(appId); return n })
    if (res.ok) loadApps()
  }

  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const filtered = apps
    .filter(a => {
      if (showFilter === 'unseen' && seenAppIds.has(a.id)) return false
      if (showFilter === 'pending' && a.is_member) return false
      return !search || [a.name, a.email, a.car_year, a.car_model, a.source, a.phone].some(v => v?.toLowerCase().includes(search.toLowerCase())) || (search.replace(/\D/g,'') && a.phone?.replace(/\D/g,'').includes(search.replace(/\D/g,'')))
    })
    .sort((a, b) => {
      if (sortApps === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (sortApps === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sortApps === 'name_az') return (a.name || '').localeCompare(b.name || '')
      if (sortApps === 'name_za') return (b.name || '').localeCompare(a.name || '')
      return 0
    })
  const totalInvited = apps.filter(a => a.is_member).length

  function exportCSV() {
    const rows = filtered.map(a => ({
      Name: a.name || '',
      Email: a.email || '',
      Phone: a.phone || '',
      'Car Year': a.car_year || '',
      'Car Model': a.car_model || '',
      Source: a.source || '',
      Applied: a.created_at ? new Date(a.created_at).toLocaleDateString('en-CA') : '',
      Status: a.is_member ? 'Invited / Member' : 'Pending',
      Registrations: (a.registrations || []).map(r => r.event || '').filter(Boolean).join('; '),
    }))
    const headers = Object.keys(rows[0] || {})
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(','))].join('\n')
    const el = document.createElement('a')
    el.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    el.download = `canvas-routes-applications-${new Date().toISOString().slice(0,10)}.csv`
    el.click()
    URL.revokeObjectURL(el.href)
  }

  function copyEmails() {
    const emails = filtered.map(a => a.email).filter(Boolean).join(', ')
    navigator.clipboard?.writeText(emails).then(() => {
      setEmailsCopied(true)
      setTimeout(() => setEmailsCopied(false), 1500)
    }).catch(() => {})
  }
  const unseenCount = apps.filter(a => !seenAppIds.has(a.id)).length

  useEffect(() => { onUnseenCountChange?.(unseenCount) }, [unseenCount, onUnseenCountChange])

  function InfoCell({ label, value, copyable }) {
    return (
      <div>
        <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ fontSize: '13px', color: value ? '#444' : '#ddd', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          <span>{value || '—'}</span>
          {copyable && <CopyBtn value={value} />}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Applications', value: apps.length, color: '#1a1a1a' },
          { label: 'Invited', value: totalInvited, color: '#3B6B2F' },
          { label: 'Pending Review', value: apps.length - totalInvited, color: '#8A6535' },
          { label: 'New', value: unseenCount, color: unseenCount > 0 ? '#7B2032' : '#999', filter: 'unseen' },
        ].map(s => (
          <div key={s.label}
            onClick={() => s.filter ? setShowFilter(f => f === s.filter ? 'all' : s.filter) : undefined}
            style={{ background: '#fff', border: `0.5px solid ${s.filter && showFilter === s.filter ? 'rgba(123,32,50,0.3)' : 'rgba(0,0,0,0.1)'}`, padding: '1.25rem 1.4rem', cursor: s.filter ? 'pointer' : undefined, transition: 'border-color 0.15s' }}>
            <div style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: '2rem', fontWeight: '300', color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.3rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999' }}>
            {filtered.length} of {apps.length} application{apps.length !== 1 ? 's' : ''}
          </div>
          {apps.length > 0 && (
            <button onClick={exportCSV} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
              Export CSV
            </button>
          )}
          {apps.length > 0 && (
            <button onClick={copyEmails} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: emailsCopied ? '#3B6B2F' : '#888', background: 'none', border: `0.5px solid ${emailsCopied ? 'rgba(59,107,47,0.3)' : 'rgba(0,0,0,0.15)'}`, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
              {emailsCopied ? 'Copied!' : 'Copy Emails'}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: isMobile ? '100%' : undefined, flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'unseen', label: `Unseen${unseenCount > 0 ? ` (${unseenCount})` : ''}` },
            { key: 'pending', label: 'Not Invited' },
          ].map(f => (
            <button key={f.key} onClick={() => setShowFilter(f.key)}
              style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', border: '0.5px solid', transition: 'all 0.15s',
                background: showFilter === f.key ? (f.key === 'unseen' ? 'rgba(123,32,50,0.07)' : 'rgba(0,0,0,0.06)') : 'none',
                color: showFilter === f.key ? (f.key === 'unseen' ? '#7B2032' : '#1a1a1a') : '#888',
                borderColor: showFilter === f.key ? (f.key === 'unseen' ? 'rgba(123,32,50,0.3)' : 'rgba(0,0,0,0.25)') : 'rgba(0,0,0,0.15)',
              }}>
              {f.label}
            </button>
          ))}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <select value={sortApps} onChange={e => setSortApps(e.target.value)}
              style={{ ...sel, width: '160px', fontSize: '11px', padding: '0.62rem 2rem 0.62rem 0.75rem' }}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name_az">Name A → Z</option>
              <option value="name_za">Name Z → A</option>
            </select>
            <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div style={{ position: 'relative', width: isMobile ? '100%' : '280px' }}>
            <input style={{ ...inp, width: '100%', paddingRight: search ? '2rem' : undefined }} placeholder="Search name, email, car, source…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '16px', lineHeight: 1, padding: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>×</button>}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No applications yet.</div>
      ) : (
        <div style={isMobile ? {} : { overflowX: 'auto' }}>
        <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff', ...(isMobile ? {} : { minWidth: '700px' }) }}>
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1.2fr 0.8fr 90px 110px', padding: '0.65rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf9' }}>
              {['Name', 'Email', 'Car', 'DOB', 'Date', ''].map((h, i) => (
                <div key={i} style={{ fontSize: '10px', letterSpacing: '0.13em', textTransform: 'uppercase', color: '#999' }}>{h}</div>
              ))}
            </div>
          )}

          {filtered.map((a, idx) => (
            <div key={a.id} style={{ borderBottom: idx < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
              {/* Summary row */}
              {(() => {
                const isGreyed = a.is_contact && !a.reregistered_at
                const handleRowClick = () => {
                  setExpanded(expanded === a.id ? null : a.id)
                  if (editingApp === a.id) setEditingApp(null)
                  if (appTierPick === a.id) setAppTierPick(null)
                  if (a.reregistered_at) {
                    setApps(prev => prev.map(x => x.id === a.id ? { ...x, reregistered_at: null } : x))
                    fetch(`/api/admin/applications/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reregistered_at: null }) })
                  }
                }
                const inviteCell = (
                  <div onClick={e => e.stopPropagation()}>
                    {a.is_member || inviteStatus[a.id] === 'success' ? (
                      <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.3)', padding: '3px 9px', background: 'rgba(59,107,47,0.07)' }}>Invited</span>
                    ) : appTierPick === a.id ? (
                      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        <button onClick={() => sendInvite(a, 'routes_member')}
                          style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: '0.5px solid rgba(197,168,130,0.5)', padding: '3px 7px', cursor: 'pointer', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}>
                          Routes
                        </button>
                        <button onClick={() => sendInvite(a, 'inner_circle')}
                          style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.5)', padding: '3px 7px', cursor: 'pointer', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}>
                          Inner Circle
                        </button>
                        <button onClick={() => setAppTierPick(null)}
                          style={{ fontSize: '11px', color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontFamily: 'var(--font-inter),sans-serif' }}>×</button>
                      </div>
                    ) : (
                      <div>
                        <PrimaryBtn onClick={() => setAppTierPick(a.id)} disabled={inviting === a.id}>
                          {inviting === a.id ? '…' : 'Invite'}
                        </PrimaryBtn>
                        {inviteStatus[a.id] && inviteStatus[a.id] !== 'success' && (
                          <div style={{ fontSize: '10px', color: '#7B2032', marginTop: '0.3rem' }}>{inviteStatus[a.id]}</div>
                        )}
                      </div>
                    )}
                  </div>
                )
                if (isMobile) {
                  return (
                    <div style={{ padding: '0.85rem 1rem', cursor: 'pointer', background: isGreyed ? 'rgba(0,0,0,0.025)' : undefined }} onClick={handleRowClick}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', minWidth: 0 }}>
                          {!seenAppIds.has(a.id) && (
                          <button
                            onClick={e => { e.stopPropagation(); markSeen(a.id) }}
                            title="Mark as seen"
                            style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#7B2032', flexShrink: 0, display: 'inline-block', border: 'none', padding: 0, cursor: 'pointer' }}
                          />
                        )}
                          {a.reregistered_at && <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c5a882', border: '0.5px solid rgba(197,168,130,0.5)', padding: '2px 6px', background: 'rgba(197,168,130,0.08)', whiteSpace: 'nowrap', flexShrink: 0 }}>↩ Re-reg</span>}
                          <span style={{ fontSize: '13px', color: isGreyed ? '#bbb' : '#1a1a1a' }}>{a.name || <span style={{ color: '#ccc' }}>—</span>}</span>
                        </div>
                        {inviteCell}
                      </div>
                      <div style={{ fontSize: '12px', color: isGreyed ? '#bbb' : '#666', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>{a.email}<CopyBtn value={a.email} /></div>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: isGreyed ? '#bbb' : '#888' }}>{(() => { const {make,model} = parseCarMakeModel(a.car_model); return [a.car_year, make, model].filter(Boolean).join(' ') || '—' })()}</span>
                        <span style={{ fontSize: '11px', color: '#bbb' }}>{new Date(a.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  )
                }
                return (
                <div
                  style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1.2fr 0.8fr 90px 110px', padding: '0.85rem 1.25rem', alignItems: 'center', cursor: 'pointer', background: isGreyed ? 'rgba(0,0,0,0.025)' : undefined }}
                  onClick={handleRowClick}
                >
                  <div style={{ fontSize: '13px', color: isGreyed ? '#bbb' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {!seenAppIds.has(a.id) && (
                      <button
                        onClick={e => { e.stopPropagation(); markSeen(a.id) }}
                        title="Mark as seen"
                        style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#7B2032', flexShrink: 0, display: 'inline-block', border: 'none', padding: 0, cursor: 'pointer' }}
                      />
                    )}
                    {a.reregistered_at && <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c5a882', border: '0.5px solid rgba(197,168,130,0.5)', padding: '2px 6px', background: 'rgba(197,168,130,0.08)', whiteSpace: 'nowrap', flexShrink: 0 }}>↩ Re-registered</span>}
                    {a.name || <span style={{ color: '#ccc' }}>—</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: isGreyed ? '#bbb' : '#666', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>{a.email}<CopyBtn value={a.email} /></div>
                  <div style={{ fontSize: '12px', color: isGreyed ? '#bbb' : '#888' }}>
                    {(() => { const {make,model} = parseCarMakeModel(a.car_model); return [a.car_year, make, model].filter(Boolean).join(' ') || <span style={{ color: '#ddd' }}>—</span> })()}
                  </div>
                  <div style={{ fontSize: '12px', color: isGreyed ? '#bbb' : '#888' }}>
                    {a.dob_month ? `${MONTHS_SHORT[a.dob_month - 1]} ${a.dob_day}${a.dob_year ? `, ${a.dob_year}` : ''}` : <span style={{ color: '#ddd' }}>—</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#bbb' }}>
                    {new Date(a.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  {inviteCell}
                </div>
                )
              })()}

              {/* Expanded panel */}
              {expanded === a.id && (
                <div style={{ padding: '1.25rem', background: 'rgba(197,168,130,0.04)', borderTop: '0.5px solid rgba(0,0,0,0.05)', borderLeft: '2px solid #c5a882' }}>

                  {editingApp === a.id ? (
                    /* ── Edit mode ── */
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1.5fr 90px 1.5fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                        <div><L>Name</L><input style={inp} value={editAppForm.name} onChange={e => setEditAppForm(p => ({ ...p, name: e.target.value }))} /></div>
                        <div><L>Car Year</L><input style={inp} value={editAppForm.car_year} onChange={e => setEditAppForm(p => ({ ...p, car_year: e.target.value }))} placeholder="e.g. 2019" maxLength={10} /></div>
                        <div><L>Make</L><div style={{ position: 'relative' }}><select style={sel} value={editAppForm.car_make || ''} onChange={e => setEditAppForm(p => ({ ...p, car_make: e.target.value }))}><option value="">Select</option>{CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}</select><svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></div></div>
                        <div><L>Model</L><input style={inp} value={editAppForm.car_model} onChange={e => setEditAppForm(p => ({ ...p, car_model: e.target.value }))} placeholder="e.g. M3 Competition" maxLength={80} /></div>
                        <div><L>Phone</L><input style={inp} type="tel" value={editAppForm.phone} onChange={e => setEditAppForm(p => ({ ...p, phone: e.target.value }))} maxLength={30} /></div>
                        <div><L>Instagram</L><input style={inp} value={editAppForm.instagram} onChange={e => setEditAppForm(p => ({ ...p, instagram: e.target.value }))} placeholder="handle" maxLength={50} /></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 2fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                        <div>
                          <L>DOB Month</L>
                          <div style={{ position: 'relative' }}>
                            <select style={sel} value={editAppForm.dob_month} onChange={e => setEditAppForm(p => ({ ...p, dob_month: e.target.value }))}>
                              <option value="">Month</option>
                              {MONTHS.map((mo, i) => <option key={i+1} value={String(i+1)}>{mo}</option>)}
                            </select>
                            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                        </div>
                        <div>
                          <L>DOB Day</L>
                          <div style={{ position: 'relative' }}>
                            <select style={sel} value={editAppForm.dob_day} onChange={e => setEditAppForm(p => ({ ...p, dob_day: e.target.value }))}>
                              <option value="">Day</option>
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={String(d)}>{d}</option>)}
                            </select>
                            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                        </div>
                        <div>
                          <L>DOB Year</L>
                          <div style={{ position: 'relative' }}>
                            <select style={sel} value={editAppForm.dob_year} onChange={e => setEditAppForm(p => ({ ...p, dob_year: e.target.value }))}>
                              <option value="">Year</option>
                              {DOB_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                            </select>
                            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                        </div>
                        <div>
                          <L>How did they hear</L>
                          <div style={{ position: 'relative' }}>
                            <select style={sel} value={editAppForm.source} onChange={e => setEditAppForm(p => ({ ...p, source: e.target.value }))}>
                              <option value="">Select…</option>
                              {APP_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <L>Tell us more</L>
                        <textarea style={{ ...inp, height: '80px', resize: 'vertical' }} value={editAppForm.more} onChange={e => setEditAppForm(p => ({ ...p, more: e.target.value }))} maxLength={500} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <PrimaryBtn onClick={() => saveApp(a.id)} disabled={savingApp}>{savingApp ? 'Saving…' : 'Save'}</PrimaryBtn>
                        <GhostBtn onClick={() => setEditingApp(null)}>Cancel</GhostBtn>
                      </div>
                      {saveAppErr && <Err msg={saveAppErr} />}
                    </div>
                  ) : (
                    /* ── View mode ── */
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                        <InfoCell label="Name" value={a.name} />
                        <InfoCell label="Car Year" value={a.car_year} />
                        <InfoCell label="Make" value={parseCarMakeModel(a.car_model).make} />
                        <InfoCell label="Model" value={parseCarMakeModel(a.car_model).model} />
                        <InfoCell label="Phone" value={a.phone} copyable />
                        <InfoCell label="Instagram" value={a.instagram ? `@${a.instagram}` : null} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                        <InfoCell label="DOB" value={a.dob_month ? `${MONTHS_SHORT[a.dob_month - 1]} ${a.dob_day}${a.dob_year ? `, ${a.dob_year}` : ''}` : null} />
                        <InfoCell label="How they heard" value={a.source} />
                        <InfoCell label="Applied" value={new Date(a.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })} />
                      </div>
                      {a.more && (
                        <div style={{ marginBottom: '1rem' }}>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>Tell us more</div>
                          <div style={{ fontSize: '13px', color: '#444', lineHeight: '1.65' }}>{a.more}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Event registrations */}
                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.6rem' }}>Event Registrations</div>
                    {(() => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const canonicalNames = new Set(CANONICAL_EVENTS.map(e => e.name))
                      const extraRegs = (a.registrations || []).filter(r => !canonicalNames.has(normalizeEventName(r.event)) && r.event !== 'Canvas Routes Membership')
                      const allRows = [
                        ...CANONICAL_EVENTS.map(ev => {
                          const reg = (a.registrations || []).find(r => normalizeEventName(r.event) === ev.name)
                          return { eventName: ev.name, eventDate: ev.date, reg: reg || null }
                        }),
                        ...extraRegs.map(r => ({ eventName: r.event, eventDate: null, reg: r })),
                      ]
                      return allRows.map(({ eventName, eventDate, reg }) => {
                        const isPast = eventDate ? new Date(eventDate) <= today : true
                        const isNA = isPast && (!reg || (reg.registered_at === null && reg.attended === null))
                        return (
                          <div key={eventName} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', color: '#444', minWidth: isMobile ? '0' : '260px' }}>{eventName}</span>
                            {reg?.registered_at && (
                              <span style={{ fontSize: '11px', color: '#bbb' }}>
                                {new Date(reg.registered_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                            {isNA ? (
                              <span style={{ fontSize: '10px', color: '#ccc', letterSpacing: '0.06em' }}>N/A</span>
                            ) : isPast ? (
                              <>
                                <button onClick={() => toggleAttended(a.id, eventName, true)}
                                  style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', border: reg?.attended === true ? '0.5px solid #3B6B2F' : '0.5px solid rgba(0,0,0,0.14)', background: reg?.attended === true ? 'rgba(59,107,47,0.1)' : 'transparent', color: reg?.attended === true ? '#3B6B2F' : '#888' }}>
                                  ✓ Attended
                                </button>
                                <button onClick={() => toggleAttended(a.id, eventName, false)}
                                  style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', border: reg?.attended === false ? '0.5px solid #7B2032' : '0.5px solid rgba(0,0,0,0.14)', background: reg?.attended === false ? 'rgba(123,32,50,0.08)' : 'transparent', color: reg?.attended === false ? '#7B2032' : '#888' }}>
                                  ✗ No-show
                                </button>
                              </>
                            ) : (
                              <span style={{ fontSize: '10px', color: '#ccc', letterSpacing: '0.06em' }}>Upcoming</span>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>

                  {/* Admin Notes */}
                  {editingApp !== a.id && (
                    <AppAdminNotes key={a.id} appId={a.id} initialNotes={a.admin_notes} onSaved={notes => setApps(prev => prev.map(x => x.id === a.id ? { ...x, admin_notes: notes } : x))} />
                  )}

                  {/* Action row */}
                  {editingApp !== a.id && (
                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {!a.is_contact ? (
                          <GhostBtn onClick={() => addToContact(a.id)} small disabled={addingContact.has(a.id)}>
                            {addingContact.has(a.id) ? '…' : 'Add to Contacts'}
                          </GhostBtn>
                        ) : (
                          <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.3)', padding: '3px 9px', background: 'rgba(59,107,47,0.07)' }}>✓ In Contacts</span>
                        )}
                        {!seenAppIds.has(a.id) && (
                          <GhostBtn small onClick={() => { markSeen(a.id); setExpanded(null) }}>Mark as Seen</GhostBtn>
                        )}
                        {seenAppIds.has(a.id) && !a.is_contact && !a.is_member && (
                          <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#bbb' }}>Reviewed</span>
                        )}
                        <GhostBtn onClick={() => startEditApp(a)} small>Edit</GhostBtn>
                        <DangerBtn small onClick={() => setDeleteAppConfirm(a.id)}>Delete</DangerBtn>
                      </div>
                      {deleteAppConfirm === a.id && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: '#7B2032' }}>Delete application from {a.name || a.email}?</span>
                          <GhostBtn small onClick={() => deleteApp(a)}>Confirm</GhostBtn>
                          <GhostBtn small onClick={() => { setDeleteAppConfirm(null); setDeleteAppError(null) }}>Cancel</GhostBtn>
                          {deleteAppError && <Err msg={deleteAppError} />}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        </div>
      )}
    </div>
  )
}

// ─── VCard download button (hover-safe) ──────────────────────────────────────

function VCardBtn({ onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      title="Save to Contacts (.vcf)"
      style={{ background: 'none', border: `0.5px solid ${hovered ? '#c5a882' : 'rgba(0,0,0,0.15)'}`, borderRadius: '3px', padding: '0.28rem 0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#666', transition: 'border-color 0.15s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    </button>
  )
}

// ─── Contacts Tab ────────────────────────────────────────────────────────────

function ContactsTab({ isMobile, searchOverride, onSearchOverrideConsumed }) {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [search, setSearch] = useState('')
  const [sortContacts, setSortContacts] = useState('name_az')
  const [selected, setSelected] = useState(new Set())
  const [emailsCopied, setEmailsCopied] = useState(false)
  const [contactInviteStatus, setContactInviteStatus] = useState({}) // keyed by contact_id: 'sending'|'sent'|'error'
  const [contactTierPick, setContactTierPick] = useState(null) // contact_id being tier-picked
  const [editingContact, setEditingContact] = useState(null) // contact_id
  const [editContactForm, setEditContactForm] = useState({})
  const [savingContact, setSavingContact] = useState(false)
  const [saveContactErr, setSaveContactErr] = useState(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', email: '', phone: '', car_year: '', car_make: '', car_model: '' })
  const [newErr, setNewErr] = useState(null)
  const [savingNew, setSavingNew] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [noteValue, setNoteValue] = useState('')
  const [removeContactConfirm, setRemoveContactConfirm] = useState(null)
  const [removeContactError, setRemoveContactError] = useState(null)
  const [deleteSelectedConfirm, setDeleteSelectedConfirm] = useState(false)
  const letterRefsMap = useRef({})
  const lastTouchedLetter = useRef(null)

  useEffect(() => {
    if (searchOverride) { setSearch(searchOverride); onSearchOverrideConsumed?.() }
  }, [searchOverride])

  function getFirstLetter(name) {
    const ch = (name || '').trim()[0]?.toUpperCase()
    return (ch && /[A-Z]/.test(ch)) ? ch : '#'
  }

  function scrollToLetter(letter) {
    const el = letterRefsMap.current[letter]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleAlphaTouch(e) {
    e.preventDefault()
    const touch = e.touches[0]
    if (!touch) return
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const letter = el?.dataset?.alphaLetter
    if (letter && letter !== lastTouchedLetter.current) {
      lastTouchedLetter.current = letter
      scrollToLetter(letter)
    }
  }

  function downloadVCard(c) {
    const esc = v => (v || '').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
    const nameParts = (c.name || '').trim().split(' ')
    const first = nameParts[0] || ''
    const last = nameParts.slice(1).join(' ') || ''
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${esc(c.name)}`,
      `N:${esc(last)};${esc(first)};;;`,
      c.email ? `EMAIL;TYPE=INTERNET:${c.email}` : null,
      c.phone ? `TEL;TYPE=CELL,VOICE:${c.phone}` : null,
      c.instagram ? `X-SOCIALPROFILE;TYPE=instagram:${c.instagram}` : null,
      `NOTE:Canvas Routes${c.car_year || c.car_model ? ` · ${[c.car_year, c.car_model].filter(Boolean).join(' ')}` : ''}`,
      (c.dob_year && c.dob_month && c.dob_day) ? `BDAY:${c.dob_year}-${String(c.dob_month).padStart(2,'0')}-${String(c.dob_day).padStart(2,'0')}` : null,
      'END:VCARD',
    ].filter(Boolean).join('\r\n')
    const blob = new Blob([lines], { type: 'text/vcard;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(c.name || 'contact').replace(/\s+/g, '_')}.vcf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const loadContacts = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/contacts')
    const data = await res.json()
    setContacts(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { loadContacts() }, [loadContacts])

  async function removeContact(contactId) {
    setRemoveContactError(null)
    const res = await fetch(`/api/admin/contacts/${contactId}`, { method: 'DELETE' })
    if (res.ok) { setRemoveContactConfirm(null); setSelected(prev => { const n = new Set(prev); n.delete(contactId); return n }); loadContacts() }
    else setRemoveContactError('Failed to remove contact.')
  }

  async function inviteContact(c, tier = 'routes_member') {
    setContactInviteStatus(p => ({ ...p, [c.contact_id]: 'sending' }))
    const res = await fetch('/api/admin/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: c.name, email: c.email, membership_status: 'pending', tier }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setContactInviteStatus(p => ({ ...p, [c.contact_id]: 'sent' }))
      setContacts(prev => prev.map(x => x.contact_id === c.contact_id ? { ...x, is_invited: true } : x))
    } else {
      setContactInviteStatus(p => ({ ...p, [c.contact_id]: data.error || 'Error' }))
      setTimeout(() => setContactInviteStatus(p => { const n = {...p}; delete n[c.contact_id]; return n }), 4000)
    }
  }

  async function deleteSelected() {
    if (!selected.size) return
    await Promise.all([...selected].map(id => fetch(`/api/admin/contacts/${id}`, { method: 'DELETE' })))
    setSelected(new Set())
    setDeleteSelectedConfirm(false)
    loadContacts()
  }

  function startEditContact(c) {
    setEditingContact(c.contact_id)
    setSaveContactErr(null)
    const { make: cMake, model: cModel } = parseCarMakeModel(c.car_model)
    setEditContactForm({
      name: c.name || '',
      car_year: c.car_year || '',
      car_make: cMake,
      car_model: cModel,
      phone: c.phone || '',
      instagram: c.instagram || '',
      dob_month: c.dob_month ? String(c.dob_month) : '',
      dob_day: c.dob_day ? String(c.dob_day) : '',
      dob_year: c.dob_year ? String(c.dob_year) : '',
      source: c.source || '',
      more: c.more || '',
    })
  }

  async function saveContact(c) {
    setSavingContact(true); setSaveContactErr(null)
    const payload = {
      ...editContactForm,
      car_model: [editContactForm.car_make, editContactForm.car_model].filter(Boolean).join(' '),
      dob_month: editContactForm.dob_month ? parseInt(editContactForm.dob_month) : null,
      dob_day: editContactForm.dob_day ? parseInt(editContactForm.dob_day) : null,
      dob_year: editContactForm.dob_year ? parseInt(editContactForm.dob_year) : null,
    }
    const res = await fetch(`/api/admin/applications/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    setSavingContact(false)
    if (!res.ok) { const d = await res.json(); setSaveContactErr(d.error || 'Failed to save.'); return }
    setContacts(prev => prev.map(x => x.contact_id === c.contact_id ? { ...x, ...payload } : x))
    setEditingContact(null)
  }

  async function toggleAttended(appId, eventName, value) {
    const contact = contacts.find(c => c.id === appId)
    if (!contact) return
    const existing = contact.registrations || []
    const idx = existing.findIndex(r => r.event === eventName)
    let newRegs
    if (idx !== -1) {
      newRegs = existing.map((r, i) => i === idx ? { ...r, attended: r.attended === value ? null : value } : r)
    } else {
      newRegs = [...existing, { event: eventName, registered_at: null, attended: value }]
    }
    const res = await fetch(`/api/admin/applications/${appId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registrations: newRegs }),
    })
    if (res.ok) setContacts(prev => prev.map(c => c.id === appId ? { ...c, registrations: newRegs } : c))
  }

  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  function exportCSV() {
    const source = selected.size > 0 ? contacts.filter(c => selected.has(c.contact_id)) : contacts
    const rows = source.map(c => ({
      Name: c.name || '',
      Email: c.email || '',
      Phone: c.phone || '',
      Instagram: c.instagram ? `@${c.instagram}` : '',
      Car: [c.car_year, c.car_model].filter(Boolean).join(' '),
      DOB: c.dob_month ? `${MONTHS_SHORT[c.dob_month - 1]} ${c.dob_day}${c.dob_year ? ` ${c.dob_year}` : ''}` : '',
      Source: c.source || '',
      Applied: c.created_at ? new Date(c.created_at).toLocaleDateString('en-CA') : '',
    }))
    const headers = Object.keys(rows[0] || {})
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `canvas-routes-contacts-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function saveNote(contactId, value, email) {
    const trimmed = value.trim()
    await fetch(`/api/admin/contacts/${contactId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: trimmed || null, email: email || undefined }),
    })
    setContacts(prev => prev.map(x => x.contact_id === contactId ? { ...x, notes: trimmed || null } : x))
    setEditingNote(null)
  }

  async function addNewContact(e) {
    e.preventDefault()
    setNewErr(null)
    if (!newForm.name.trim() || !newForm.email.trim()) { setNewErr('Name and email are required.'); return }
    setSavingNew(true)
    const res = await fetch('/api/admin/contacts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newForm, car_model: [newForm.car_make, newForm.car_model].filter(Boolean).join(' ') }),
    })
    const data = await res.json().catch(() => ({}))
    setSavingNew(false)
    if (!res.ok) { setNewErr(data.error || 'Failed to add contact.'); return }
    setAddingNew(false)
    setNewForm({ name: '', email: '', phone: '', car_year: '', car_make: '', car_model: '' })
    loadContacts()
  }

  const filtered = contacts
    .filter(c => !search || [c.name, c.email, c.car_year, c.car_model, c.phone].some(v => v?.toLowerCase().includes(search.toLowerCase())) || (search.replace(/\D/g,'') && c.phone?.replace(/\D/g,'').includes(search.replace(/\D/g,''))))
    .sort((a, b) => {
      if (sortContacts === 'name_az') return (a.name || '').localeCompare(b.name || '')
      if (sortContacts === 'name_za') return (b.name || '').localeCompare(a.name || '')
      if (sortContacts === 'newest') return new Date(b.contact_created_at || b.created_at) - new Date(a.contact_created_at || a.created_at)
      if (sortContacts === 'oldest') return new Date(a.contact_created_at || a.created_at) - new Date(b.contact_created_at || b.created_at)
      return 0
    })

  function copyEmails() {
    const source = selected.size > 0 ? contacts.filter(c => selected.has(c.contact_id)) : filtered
    const emails = source.map(c => c.email).filter(Boolean).join(', ')
    navigator.clipboard?.writeText(emails).then(() => {
      setEmailsCopied(true)
      setTimeout(() => setEmailsCopied(false), 1500)
    }).catch(() => {})
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Contacts', value: contacts.length, color: '#1a1a1a' },
          { label: 'Invited to Membership', value: contacts.filter(c => c.is_invited).length, color: '#3B6B2F' },
          { label: 'Has Car Info', value: contacts.filter(c => c.car_year || c.car_model).length, color: '#8A6535' },
          { label: 'With Email', value: contacts.filter(c => c.email).length, color: '#1a1a1a' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.25rem 1.4rem' }}>
            <div style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: '2rem', fontWeight: '300', color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.3rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.6rem 1rem', background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.3)' }}>
          <span style={{ fontSize: '11px', color: '#8A6535', letterSpacing: '0.06em' }}>{selected.size} selected</span>
          <button onClick={exportCSV} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', background: 'none', border: '0.5px solid rgba(59,107,47,0.35)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>Export CSV</button>
          <button onClick={copyEmails} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: emailsCopied ? '#3B6B2F' : '#888', background: 'none', border: `0.5px solid ${emailsCopied ? 'rgba(59,107,47,0.3)' : 'rgba(0,0,0,0.15)'}`, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>{emailsCopied ? 'Copied!' : 'Copy Emails'}</button>
          {deleteSelectedConfirm ? (
            <>
              <span style={{ fontSize: '11px', color: '#7B2032' }}>Remove {selected.size} contact{selected.size > 1 ? 's' : ''}?</span>
              <GhostBtn small onClick={deleteSelected}>Confirm</GhostBtn>
              <GhostBtn small onClick={() => setDeleteSelectedConfirm(false)}>Cancel</GhostBtn>
            </>
          ) : (
            <button onClick={() => setDeleteSelectedConfirm(true)} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7B2032', background: 'none', border: '0.5px solid rgba(123,32,50,0.3)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>Remove</button>
          )}
          <button onClick={() => setSelected(new Set())} style={{ fontSize: '10px', color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', marginLeft: 'auto' }}>Clear</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999' }}>
            {filtered.length} of {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </div>
          {contacts.length > 0 && selected.size === 0 && (
            <button onClick={exportCSV} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
              Export All
            </button>
          )}
          {contacts.length > 0 && selected.size === 0 && (
            <button onClick={copyEmails} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: emailsCopied ? '#3B6B2F' : '#888', background: 'none', border: `0.5px solid ${emailsCopied ? 'rgba(59,107,47,0.3)' : 'rgba(0,0,0,0.15)'}`, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
              {emailsCopied ? 'Copied!' : 'Copy Emails'}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: isMobile ? '100%' : undefined }}>
          <button onClick={() => { setAddingNew(v => !v); setNewErr(null) }}
            style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: addingNew ? '#7B2032' : '#3B6B2F', background: 'none', border: `0.5px solid ${addingNew ? 'rgba(123,32,50,0.35)' : 'rgba(59,107,47,0.35)'}`, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}>
            {addingNew ? 'Cancel' : '+ New Contact'}
          </button>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <select value={sortContacts} onChange={e => setSortContacts(e.target.value)}
              style={{ ...sel, width: '160px', fontSize: '11px', padding: '0.62rem 2rem 0.62rem 0.75rem' }}>
              <option value="name_az">Name A → Z</option>
              <option value="name_za">Name Z → A</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div style={{ position: 'relative', width: isMobile ? '100%' : '280px' }}>
            <input style={{ ...inp, width: '100%', paddingRight: search ? '2rem' : undefined }} placeholder="Search name, email, car…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '16px', lineHeight: 1, padding: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>×</button>}
          </div>
        </div>
      </div>

      {addingNew && (
        <form onSubmit={addNewContact} style={{ marginBottom: '1.5rem', padding: '1.25rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888', marginBottom: '1rem' }}>New Contact</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div><L>Name *</L><input style={inp} value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" maxLength={100} /></div>
            <div><L>Email *</L><input style={inp} type="email" value={newForm.email} onChange={e => setNewForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" maxLength={254} /></div>
            <div><L>Phone</L><input style={inp} value={newForm.phone} onChange={e => setNewForm(p => ({ ...p, phone: e.target.value }))} placeholder="(514) 000-0000" maxLength={30} /></div>
            <div><L>Car Year</L><input style={inp} value={newForm.car_year} onChange={e => setNewForm(p => ({ ...p, car_year: e.target.value }))} placeholder="e.g. 2019" maxLength={10} /></div>
            <div><L>Make</L><div style={{ position: 'relative' }}><select style={sel} value={newForm.car_make} onChange={e => setNewForm(p => ({ ...p, car_make: e.target.value }))}><option value="">Select</option>{CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}</select><svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></div></div>
            <div style={{ gridColumn: isMobile ? undefined : 'span 2' }}><L>Model</L><input style={inp} value={newForm.car_model} onChange={e => setNewForm(p => ({ ...p, car_model: e.target.value }))} placeholder="e.g. M3 Competition" maxLength={80} /></div>
          </div>
          {newErr && <div style={{ fontSize: '11px', color: '#7B2032', marginBottom: '0.75rem' }}>{newErr}</div>}
          <button type="submit" disabled={savingNew}
            style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff', background: '#1a1a1a', border: 'none', padding: '8px 20px', cursor: savingNew ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
            {savingNew ? 'Adding…' : 'Add Contact'}
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No contacts yet.</div>
      ) : (
        <>
        {/* A–Z index strip — mobile only, alphabetical sort only */}
        {isMobile && sortContacts === 'name_az' && (() => {
          const ALPHA = ['#','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z']
          const presentLetters = new Set(filtered.map(c => getFirstLetter(c.name)))
          return (
            <div
              style={{ position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 0', background: 'rgba(250,250,248,0.92)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: '10px 0 0 10px', border: '0.5px solid rgba(0,0,0,0.09)', borderRight: 'none', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
              onTouchStart={e => { lastTouchedLetter.current = null; handleAlphaTouch(e) }}
              onTouchMove={handleAlphaTouch}
              onTouchEnd={() => { lastTouchedLetter.current = null }}
            >
              {ALPHA.map(letter => (
                <div key={letter} data-alpha-letter={letter}
                  onClick={() => scrollToLetter(letter)}
                  style={{ fontSize: '10px', fontWeight: '600', fontFamily: 'var(--font-inter),sans-serif', color: presentLetters.has(letter) ? '#1a1a1a' : 'rgba(0,0,0,0.18)', padding: '2px 8px', lineHeight: 1.5, cursor: presentLetters.has(letter) ? 'pointer' : 'default', minWidth: '24px', textAlign: 'center' }}>
                  {letter}
                </div>
              ))}
            </div>
          )
        })()}
        <div style={isMobile ? { paddingRight: isMobile && sortContacts === 'name_az' ? '28px' : 0 } : { overflowX: 'auto' }}>
        <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff', ...(isMobile ? {} : { minWidth: '700px' }) }}>
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '28px 1.4fr 1.6fr 1.2fr 0.8fr 90px 140px', padding: '0.65rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf9', alignItems: 'center' }}>
              <input type="checkbox"
                checked={filtered.length > 0 && filtered.every(c => selected.has(c.contact_id))}
                ref={el => { if (el) el.indeterminate = filtered.some(c => selected.has(c.contact_id)) && !filtered.every(c => selected.has(c.contact_id)) }}
                onChange={e => {
                  if (e.target.checked) setSelected(prev => new Set([...prev, ...filtered.map(c => c.contact_id)]))
                  else setSelected(prev => { const n = new Set(prev); filtered.forEach(c => n.delete(c.contact_id)); return n })
                }}
                style={{ cursor: 'pointer', accentColor: '#7B2032', width: '13px', height: '13px' }}
              />
              {['Name', 'Email', 'Car', 'DOB', 'Applied', ''].map((h, i) => (
                <div key={i} style={{ fontSize: '10px', letterSpacing: '0.13em', textTransform: 'uppercase', color: '#999' }}>{h}</div>
              ))}
            </div>
          )}

          {filtered.flatMap((c, idx) => {
            const showLetterHeader = isMobile && sortContacts === 'name_az'
            const letter = getFirstLetter(c.name)
            const prevLetter = idx > 0 ? getFirstLetter(filtered[idx - 1].name) : null
            const header = showLetterHeader && letter !== prevLetter ? (
              <div key={`lh-${letter}`}
                ref={el => { if (el) letterRefsMap.current[letter] = el }}
                style={{ padding: '0.3rem 1rem 0.2rem', background: '#f5f4f2', borderBottom: '0.5px solid rgba(0,0,0,0.07)', fontSize: '11px', fontWeight: '600', color: '#888', letterSpacing: '0.1em', fontFamily: 'var(--font-inter),sans-serif' }}>
                {letter}
              </div>
            ) : null
            return [header, (
            <div key={c.contact_id} style={{ borderBottom: idx < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
              {/* Summary row */}
              {isMobile ? (
                <div style={{ padding: '0.85rem 1rem', cursor: 'pointer', background: selected.has(c.contact_id) ? 'rgba(123,32,50,0.03)' : undefined }}
                  onClick={() => { setExpanded(expanded === c.contact_id ? null : c.contact_id); if (editingContact === c.contact_id) setEditingContact(null); if (contactTierPick === c.contact_id) setContactTierPick(null) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox"
                        checked={selected.has(c.contact_id)}
                        onChange={e => setSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(c.contact_id) : n.delete(c.contact_id); return n })}
                        style={{ cursor: 'pointer', accentColor: '#7B2032', width: '13px', height: '13px', flexShrink: 0 }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', color: '#1a1a1a' }}>{c.name || <span style={{ color: '#ccc' }}>—</span>}</span>
                          {c.is_invited && <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.4)', padding: '1px 6px', background: 'rgba(59,107,47,0.06)', whiteSpace: 'nowrap' }}>Member</span>}
                        </div>
                        {c.notes && <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', marginTop: '2px' }}>{c.notes}</div>}
                      </div>
                    </div>
                    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                      {c.is_invited || contactInviteStatus[c.contact_id] === 'sent' ? (
                        <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', padding: '3px 8px', border: '0.5px solid rgba(59,107,47,0.3)', background: 'rgba(59,107,47,0.06)', whiteSpace: 'nowrap' }}>Invited</span>
                      ) : contactTierPick === c.contact_id ? (
                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                          <button onClick={() => { inviteContact(c, 'routes_member'); setContactTierPick(null) }}
                            style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: '0.5px solid rgba(197,168,130,0.5)', padding: '3px 7px', cursor: 'pointer', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}>
                            Routes
                          </button>
                          <button onClick={() => { inviteContact(c, 'inner_circle'); setContactTierPick(null) }}
                            style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.5)', padding: '3px 7px', cursor: 'pointer', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}>
                            Inner Circle
                          </button>
                          <button onClick={() => setContactTierPick(null)}
                            style={{ fontSize: '11px', color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontFamily: 'var(--font-inter),sans-serif' }}>×</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setContactTierPick(c.contact_id)}
                          disabled={contactInviteStatus[c.contact_id] === 'sending'}
                          style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: '0.5px solid rgba(197,168,130,0.5)', padding: '3px 8px', cursor: contactInviteStatus[c.contact_id] === 'sending' ? 'wait' : 'pointer', color: contactInviteStatus[c.contact_id] === 'error' || typeof contactInviteStatus[c.contact_id] === 'string' && contactInviteStatus[c.contact_id] !== 'sending' ? '#7B2032' : '#c5a882', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}
                        >
                          {contactInviteStatus[c.contact_id] === 'sending' ? '…' : typeof contactInviteStatus[c.contact_id] === 'string' && contactInviteStatus[c.contact_id] !== 'sending' ? 'Error' : 'Invite'}
                        </button>
                      )}
                      <button onClick={() => downloadVCard(c)} title="Save .vcf"
                        style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '3px', padding: '0.28rem 0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#666' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>{c.email}<CopyBtn value={c.email} /></div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>{(() => { const {make,model} = parseCarMakeModel(c.car_model); return [c.car_year, make, model].filter(Boolean).join(' ') || '—' })()}</span>
                    {c.created_at && <span style={{ fontSize: '11px', color: '#bbb' }}>{new Date(c.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  </div>
                </div>
              ) : (
              <div
                style={{ display: 'grid', gridTemplateColumns: '28px 1.4fr 1.6fr 1.2fr 0.8fr 90px 140px', padding: '0.85rem 1.25rem', alignItems: 'center', cursor: 'pointer', background: selected.has(c.contact_id) ? 'rgba(123,32,50,0.03)' : undefined }}
                onClick={() => { setExpanded(expanded === c.contact_id ? null : c.contact_id); if (editingContact === c.contact_id) setEditingContact(null); if (contactTierPick === c.contact_id) setContactTierPick(null) }}
              >
                <div onClick={e => e.stopPropagation()}>
                  <input type="checkbox"
                    checked={selected.has(c.contact_id)}
                    onChange={e => setSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(c.contact_id) : n.delete(c.contact_id); return n })}
                    style={{ cursor: 'pointer', accentColor: '#7B2032', width: '13px', height: '13px' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: '#1a1a1a' }}>{c.name || <span style={{ color: '#ccc' }}>—</span>}</span>
                    {c.is_invited && <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.4)', padding: '1px 6px', background: 'rgba(59,107,47,0.06)', whiteSpace: 'nowrap' }}>Member</span>}
                  </div>
                  {c.notes && <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', marginTop: '2px' }}>{c.notes}</div>}
                </div>
                <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>{c.email}<CopyBtn value={c.email} /></div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  {[c.car_year, c.car_model].filter(Boolean).join(' ') || <span style={{ color: '#ddd' }}>—</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  {c.dob_month ? `${MONTHS_SHORT[c.dob_month - 1]} ${c.dob_day}${c.dob_year ? `, ${c.dob_year}` : ''}` : <span style={{ color: '#ddd' }}>—</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#bbb' }}>
                  {c.created_at ? new Date(c.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </div>
                <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {c.is_invited || contactInviteStatus[c.contact_id] === 'sent' ? (
                    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', padding: '3px 8px', border: '0.5px solid rgba(59,107,47,0.3)', background: 'rgba(59,107,47,0.06)', whiteSpace: 'nowrap' }}>Invited</span>
                  ) : contactTierPick === c.contact_id ? (
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                      <button onClick={() => { inviteContact(c, 'routes_member'); setContactTierPick(null) }}
                        style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: '0.5px solid rgba(197,168,130,0.5)', padding: '3px 7px', cursor: 'pointer', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}>
                        Routes
                      </button>
                      <button onClick={() => { inviteContact(c, 'inner_circle'); setContactTierPick(null) }}
                        style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.5)', padding: '3px 7px', cursor: 'pointer', color: '#c5a882', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}>
                        Inner Circle
                      </button>
                      <button onClick={() => setContactTierPick(null)}
                        style={{ fontSize: '11px', color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontFamily: 'var(--font-inter),sans-serif' }}>×</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setContactTierPick(c.contact_id)}
                      disabled={contactInviteStatus[c.contact_id] === 'sending'}
                      style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: '0.5px solid rgba(197,168,130,0.5)', padding: '3px 8px', cursor: contactInviteStatus[c.contact_id] === 'sending' ? 'wait' : 'pointer', color: contactInviteStatus[c.contact_id] === 'error' || typeof contactInviteStatus[c.contact_id] === 'string' && contactInviteStatus[c.contact_id] !== 'sending' ? '#7B2032' : '#c5a882', fontFamily: 'var(--font-inter),sans-serif', whiteSpace: 'nowrap' }}
                    >
                      {contactInviteStatus[c.contact_id] === 'sending' ? '…' : typeof contactInviteStatus[c.contact_id] === 'string' && contactInviteStatus[c.contact_id] !== 'sending' ? 'Error' : 'Invite'}
                    </button>
                  )}
                  <VCardBtn onClick={() => downloadVCard(c)} />
                </div>
              </div>
              )}

              {/* Expanded panel */}
              {expanded === c.contact_id && (
                <div style={{ padding: '1.25rem', background: 'rgba(197,168,130,0.04)', borderTop: '0.5px solid rgba(0,0,0,0.05)', borderLeft: '2px solid #c5a882' }}>

                  {editingContact === c.contact_id ? (
                    /* ── Edit mode ── */
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1.5fr 90px 1.5fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                        <div><L>Name</L><input style={inp} value={editContactForm.name} onChange={e => setEditContactForm(p => ({ ...p, name: e.target.value }))} /></div>
                        <div><L>Car Year</L><input style={inp} value={editContactForm.car_year} onChange={e => setEditContactForm(p => ({ ...p, car_year: e.target.value }))} placeholder="e.g. 2019" maxLength={10} /></div>
                        <div><L>Make</L><div style={{ position: 'relative' }}><select style={sel} value={editContactForm.car_make || ''} onChange={e => setEditContactForm(p => ({ ...p, car_make: e.target.value }))}><option value="">Select</option>{CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}</select><svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></div></div>
                        <div><L>Model</L><input style={inp} value={editContactForm.car_model} onChange={e => setEditContactForm(p => ({ ...p, car_model: e.target.value }))} placeholder="e.g. M3 Competition" maxLength={80} /></div>
                        <div><L>Phone</L><input style={inp} type="tel" value={editContactForm.phone} onChange={e => setEditContactForm(p => ({ ...p, phone: e.target.value }))} maxLength={30} /></div>
                        <div><L>Instagram</L><input style={inp} value={editContactForm.instagram} onChange={e => setEditContactForm(p => ({ ...p, instagram: e.target.value }))} placeholder="handle" maxLength={50} /></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 2fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                        <div>
                          <L>DOB Month</L>
                          <div style={{ position: 'relative' }}>
                            <select style={sel} value={editContactForm.dob_month} onChange={e => setEditContactForm(p => ({ ...p, dob_month: e.target.value }))}>
                              <option value="">Month</option>
                              {MONTHS.map((mo, i) => <option key={i+1} value={String(i+1)}>{mo}</option>)}
                            </select>
                            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                        </div>
                        <div>
                          <L>DOB Day</L>
                          <div style={{ position: 'relative' }}>
                            <select style={sel} value={editContactForm.dob_day} onChange={e => setEditContactForm(p => ({ ...p, dob_day: e.target.value }))}>
                              <option value="">Day</option>
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={String(d)}>{d}</option>)}
                            </select>
                            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                        </div>
                        <div>
                          <L>DOB Year</L>
                          <div style={{ position: 'relative' }}>
                            <select style={sel} value={editContactForm.dob_year} onChange={e => setEditContactForm(p => ({ ...p, dob_year: e.target.value }))}>
                              <option value="">Year</option>
                              {DOB_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                            </select>
                            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                        </div>
                        <div>
                          <L>How did they hear</L>
                          <div style={{ position: 'relative' }}>
                            <select style={sel} value={editContactForm.source} onChange={e => setEditContactForm(p => ({ ...p, source: e.target.value }))}>
                              <option value="">Select…</option>
                              {APP_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <L>Tell us more</L>
                        <textarea style={{ ...inp, height: '80px', resize: 'vertical' }} value={editContactForm.more} onChange={e => setEditContactForm(p => ({ ...p, more: e.target.value }))} maxLength={500} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <PrimaryBtn onClick={() => saveContact(c)} disabled={savingContact}>{savingContact ? 'Saving…' : 'Save'}</PrimaryBtn>
                        <GhostBtn onClick={() => setEditingContact(null)}>Cancel</GhostBtn>
                      </div>
                      {saveContactErr && <Err msg={saveContactErr} />}
                    </div>
                  ) : (
                    /* ── View mode ── */
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>Name</div>
                          <div style={{ fontSize: '13px', color: c.name ? '#444' : '#ddd' }}>{c.name || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>Car Year</div>
                          <div style={{ fontSize: '13px', color: c.car_year ? '#444' : '#ddd' }}>{c.car_year || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>Car Make & Model</div>
                          <div style={{ fontSize: '13px', color: c.car_model ? '#444' : '#ddd' }}>{c.car_model || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>Phone</div>
                          <div style={{ fontSize: '13px', color: c.phone ? '#444' : '#ddd', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><span>{c.phone || '—'}</span><CopyBtn value={c.phone} /></div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>Instagram</div>
                          <div style={{ fontSize: '13px', color: c.instagram ? '#444' : '#ddd', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            {c.instagram ? (
                              <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                                </svg>
                                <a href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noreferrer" style={{ color: '#444', textDecoration: 'none' }}>@{c.instagram}</a>
                              </>
                            ) : '—'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>DOB</div>
                          <div style={{ fontSize: '13px', color: c.dob_month ? '#444' : '#ddd' }}>
                            {c.dob_month ? `${MONTHS_SHORT[c.dob_month - 1]} ${c.dob_day}${c.dob_year ? `, ${c.dob_year}` : ''}` : '—'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>How they heard</div>
                          <div style={{ fontSize: '13px', color: c.source ? '#444' : '#ddd' }}>{c.source || '—'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>Applied</div>
                          <div style={{ fontSize: '13px', color: '#444' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div>
                        </div>
                      </div>
                      {c.more && (
                        <div style={{ marginBottom: '1rem' }}>
                          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.25rem' }}>Tell us more</div>
                          <div style={{ fontSize: '13px', color: '#444', lineHeight: '1.65' }}>{c.more}</div>
                        </div>
                      )}
                      <div style={{ marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.35rem' }}>Quick Note</div>
                        {editingNote === c.contact_id ? (
                          <div>
                            <input autoFocus value={noteValue} maxLength={200}
                              onChange={e => setNoteValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveNote(c.contact_id, noteValue, c.email); if (e.key === 'Escape') setEditingNote(null) }}
                              style={{ ...inp, fontSize: '13px', marginBottom: '0.5rem' }}
                              placeholder="e.g. Steve — Rangers business" />
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <GhostBtn small onClick={() => saveNote(c.contact_id, noteValue, c.email)}>Save</GhostBtn>
                              <GhostBtn small onClick={() => setEditingNote(null)}>Cancel</GhostBtn>
                            </div>
                          </div>
                        ) : (
                          <div onClick={() => { setEditingNote(c.contact_id); setNoteValue(c.notes || '') }}
                            style={{ fontSize: '13px', color: c.notes ? '#444' : '#ccc', cursor: 'text', padding: '0.5rem 0.75rem', border: '1px solid rgba(0,0,0,0.1)', background: '#fff', minHeight: '36px' }}>
                            {c.notes || 'Click to add a note…'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Event registrations */}
                  {editingContact !== c.contact_id && (
                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.6rem' }}>Event Registrations</div>
                    {(() => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const canonicalNames = new Set(CANONICAL_EVENTS.map(e => e.name))
                      const extraRegs = (c.registrations || []).filter(r => !canonicalNames.has(normalizeEventName(r.event)))
                      const allRows = [
                        ...CANONICAL_EVENTS.map(ev => {
                          const reg = (c.registrations || []).find(r => normalizeEventName(r.event) === ev.name)
                          return { eventName: ev.name, eventDate: ev.date, reg: reg || null }
                        }),
                        ...extraRegs.map(r => ({ eventName: r.event, eventDate: null, reg: r })),
                      ]
                      return allRows.map(({ eventName, eventDate, reg }) => {
                        const isPast = eventDate ? new Date(eventDate) <= today : true
                        const isNA = isPast && (!reg || (reg.registered_at === null && reg.attended === null))
                        return (
                          <div key={eventName} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', color: '#444', minWidth: isMobile ? '0' : '260px' }}>{eventName}</span>
                            {reg?.registered_at && (
                              <span style={{ fontSize: '11px', color: '#bbb' }}>
                                {new Date(reg.registered_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                            {isNA ? (
                              <span style={{ fontSize: '10px', color: '#ccc', letterSpacing: '0.06em' }}>N/A</span>
                            ) : isPast ? (
                              <>
                                <button onClick={() => toggleAttended(c.id, eventName, true)}
                                  style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', border: reg?.attended === true ? '0.5px solid #3B6B2F' : '0.5px solid rgba(0,0,0,0.14)', background: reg?.attended === true ? 'rgba(59,107,47,0.1)' : 'transparent', color: reg?.attended === true ? '#3B6B2F' : '#888' }}>
                                  ✓ Attended
                                </button>
                                <button onClick={() => toggleAttended(c.id, eventName, false)}
                                  style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', border: reg?.attended === false ? '0.5px solid #7B2032' : '0.5px solid rgba(0,0,0,0.14)', background: reg?.attended === false ? 'rgba(123,32,50,0.08)' : 'transparent', color: reg?.attended === false ? '#7B2032' : '#888' }}>
                                  ✗ No-show
                                </button>
                              </>
                            ) : (
                              <span style={{ fontSize: '10px', color: '#ccc', letterSpacing: '0.06em' }}>Upcoming</span>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>
                  )}

                  {/* Admin Notes */}
                  {editingContact !== c.contact_id && (
                    <AppAdminNotes key={c.id} appId={c.id} initialNotes={c.admin_notes} onSaved={notes => setContacts(prev => prev.map(x => x.id === c.id ? { ...x, admin_notes: notes } : x))} />
                  )}

                  {/* Action row */}
                  {editingContact !== c.contact_id && (
                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <GhostBtn onClick={() => startEditContact(c)} small>Edit</GhostBtn>
                        <DangerBtn small onClick={() => setRemoveContactConfirm(c.contact_id)}>Remove</DangerBtn>
                      </div>
                      {removeContactConfirm === c.contact_id && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: '#7B2032' }}>Remove this contact?</span>
                          <GhostBtn small onClick={() => removeContact(c.contact_id)}>Confirm</GhostBtn>
                          <GhostBtn small onClick={() => { setRemoveContactConfirm(null); setRemoveContactError(null) }}>Cancel</GhostBtn>
                          {removeContactError && <Err msg={removeContactError} />}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            )].filter(Boolean)
          })}
        </div>
        </div>
        </>
      )}
    </div>
  )
}

// ─── Dashboard Tab ───────────────────────────────────────────────────────────

function DashboardTab({ isMobile, onNavigate }) {
  const [data, setData] = useState({ members: [], apps: [], contacts: [], events: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [mRes, aRes, cRes, eRes] = await Promise.all([
        fetch('/api/admin/members'),
        fetch('/api/admin/applications'),
        fetch('/api/admin/contacts'),
        fetch('/api/admin/events'),
      ])
      const [members, apps, contacts, events] = await Promise.all([
        mRes.ok ? mRes.json() : [],
        aRes.ok ? aRes.json() : [],
        cRes.ok ? cRes.json() : [],
        eRes.ok ? eRes.json() : [],
      ])
      setData({
        members: Array.isArray(members) ? members : [],
        apps: Array.isArray(apps) ? apps : [],
        contacts: Array.isArray(contacts) ? contacts : [],
        events: Array.isArray(events) ? events : [],
      })
      setLoading(false)
    }
    load()
  }, [])

  const activeMembers = data.members.filter(m => m.membership_status === 'active').length
  const pendingApps = data.apps.filter(a => !a.is_member).length

  // Recent sign-ups: last 7 from members+contacts combined by created_at
  const recentSignups = [
    ...data.members.map(m => ({ name: m.name || m.email, type: 'Member', date: m.created_at })),
    ...data.contacts.map(c => ({ name: c.name || c.email, type: 'Contact', date: c.contact_created_at || c.created_at })),
  ]
    .filter(r => r.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 7)

  // Upcoming events (next 90 days)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const in90 = new Date(today); in90.setDate(in90.getDate() + 90)
  const upcomingEvents = data.events
    .filter(e => { try { const d = new Date(e.date); return d >= today && d <= in90 } catch { return false } })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5)

  const statCards = [
    { label: 'Total Members', value: data.members.length, color: '#1a1a1a', tab: 'Members' },
    { label: 'Active Members', value: activeMembers, color: '#3B6B2F', tab: 'Members' },
    { label: 'Pending Applications', value: pendingApps, color: '#8A6535', tab: 'Applications' },
    { label: 'Total Contacts', value: data.contacts.length, color: '#1a1a1a', tab: 'Contacts' },
  ]

  return (
    <div>
      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {statCards.map(s => (
              <button key={s.label} onClick={() => onNavigate(s.tab)}
                style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.25rem 1.4rem', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                <div style={{ fontSize: '2rem', fontWeight: '300', color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.3rem' }}>{s.label}</div>
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
            {/* Recent sign-ups */}
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.5rem' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1.25rem' }}>Recent Sign-Ups</div>
              {recentSignups.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#ccc' }}>None yet.</div>
              ) : recentSignups.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0', borderBottom: i < recentSignups.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name || '—'}</div>
                    <div style={{ fontSize: '10px', color: r.type === 'Member' ? '#3B6B2F' : '#8A6535', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px' }}>{r.type}</div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#bbb', flexShrink: 0 }}>
                    {new Date(r.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>

            {/* Upcoming events */}
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.5rem' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1.25rem' }}>Upcoming Events</div>
              {upcomingEvents.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#ccc' }}>No upcoming events in the next 90 days.</div>
              ) : upcomingEvents.map((e, i) => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0', borderBottom: i < upcomingEvents.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                    {e.type && <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A6535', marginTop: '2px' }}>{e.type}</div>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#c5a882', flexShrink: 0 }}>{e.date}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Cars Tab ─────────────────────────────────────────────────────────────────

function CarsTab({ isMobile }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [assignInputs, setAssignInputs] = useState({})
  const [assigning, setAssigning] = useState({})
  const [editing, setEditing] = useState(null) // { memberId, carIndex }
  const [editForm, setEditForm] = useState({})
  const [modDraft, setModDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/members').then(r => r.json()).then(data => {
      setMembers(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  function startEdit(m, carIndex, car) {
    setEditing({ memberId: m.id, carIndex })
    setEditForm({ year: car.year || '', make: car.make || '', model: car.model || '', mods: car.mods || [] })
    setModDraft('')
  }

  function cancelEdit() { setEditing(null); setEditForm({}); setModDraft('') }

  async function saveCar() {
    setSaving(true)
    const m = members.find(x => x.id === editing.memberId)
    const cars = [...(m.cars || [])]
    cars[editing.carIndex] = { ...cars[editing.carIndex], ...editForm }
    await fetch(`/api/admin/members/${m.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cars }),
    })
    setMembers(prev => prev.map(x => x.id === m.id ? { ...x, cars } : x))
    setSaving(false)
    cancelEdit()
  }

  function addMod() {
    if (!modDraft.trim()) return
    setEditForm(f => ({ ...f, mods: [...(f.mods || []), modDraft.trim()] }))
    setModDraft('')
  }

  function removeMod(i) {
    setEditForm(f => ({ ...f, mods: f.mods.filter((_, idx) => idx !== i) }))
  }

  async function assignCar(m, make) {
    if (!make.trim()) return
    setAssigning(p => ({ ...p, [m.id]: true }))
    const existingCars = m.cars || []
    let newCars
    if (existingCars.length > 0) {
      const hasNoMake = existingCars.some(c => !c.make)
      if (hasNoMake) {
        newCars = existingCars.map(c => !c.make ? { ...c, make: make.trim() } : c)
      } else {
        newCars = [...existingCars, { year: '', make: make.trim(), model: '', mods: [] }]
      }
    } else {
      newCars = [{ year: '', make: make.trim(), model: '', mods: [] }]
    }
    await fetch(`/api/admin/members/${m.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cars: newCars }),
    })
    setMembers(prev => prev.map(x => x.id === m.id ? { ...x, cars: newCars } : x))
    setAssignInputs(p => ({ ...p, [m.id]: '' }))
    setAssigning(p => ({ ...p, [m.id]: false }))
  }

  // Group members by car make
  const brandGroups = {}
  const unassigned = []

  members.forEach(m => {
    const cars = m.cars || []
    if (m.car_make && cars.length === 0) {
      const make = m.car_make
      if (!brandGroups[make]) brandGroups[make] = []
      brandGroups[make].push({ member: m, car: { year: m.car_year || '', make, model: m.car_model || '', mods: [] }, carIndex: -1 })
      return
    }
    const carsWithMake = cars.filter(c => c.make)
    if (carsWithMake.length === 0) {
      unassigned.push(m)
    } else {
      carsWithMake.forEach((car, carIndex) => {
        const make = car.make
        if (!brandGroups[make]) brandGroups[make] = []
        brandGroups[make].push({ member: m, car, carIndex })
      })
    }
  })

  const sortedBrands = Object.keys(brandGroups).sort((a, b) => a.localeCompare(b))
  const totalBrands = sortedBrands.length

  const isEditing = (m, carIndex) => editing?.memberId === m.id && editing?.carIndex === carIndex

  return (
    <div>
      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : (
        <>
          <div style={{ fontSize: '11px', color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.75rem' }}>
            {totalBrands} brand{totalBrands !== 1 ? 's' : ''} represented
          </div>
          {sortedBrands.map(brand => (
            <div key={brand} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
              <div style={{ padding: '0.85rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)', background: '#fafaf9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a', letterSpacing: '0.02em' }}>{brand}</div>
                <div style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{brandGroups[brand].length} car{brandGroups[brand].length !== 1 ? 's' : ''}</div>
              </div>
              {brandGroups[brand].map(({ member: m, car, carIndex }, i) => (
                <div key={`${m.id}-${i}`}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr auto' : '1.5fr 1.5fr 1fr auto', padding: '0.75rem 1.25rem', borderBottom: isEditing(m, carIndex) ? 'none' : i < brandGroups[brand].length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none', alignItems: 'center', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{m.name || <span style={{ color: '#ccc' }}>—</span>}</div>
                      {isMobile && <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>{[car.year, car.model].filter(Boolean).join(' ') || '—'}{car.mods?.length > 0 && <span style={{ marginLeft: '0.3rem', color: '#c5a882' }}>{car.mods.length} mod{car.mods.length !== 1 ? 's' : ''}</span>}</div>}
                      {isMobile && <div style={{ fontSize: '11px', color: '#bbb', marginTop: '1px' }}>{m.email}</div>}
                    </div>
                    {!isMobile && <div style={{ fontSize: '12px', color: '#666' }}>{m.email}</div>}
                    {!isMobile && (
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        {[car.year, car.model].filter(Boolean).join(' ') || <span style={{ color: '#ddd' }}>—</span>}
                        {car.mods?.length > 0 && <span style={{ marginLeft: '0.4rem', fontSize: '10px', color: '#c5a882', letterSpacing: '0.06em' }}>{car.mods.length} mod{car.mods.length !== 1 ? 's' : ''}</span>}
                      </div>
                    )}
                    {carIndex >= 0 && (
                      <GhostBtn small onClick={() => isEditing(m, carIndex) ? cancelEdit() : startEdit(m, carIndex, car)}>
                        {isEditing(m, carIndex) ? 'Cancel' : 'Edit'}
                      </GhostBtn>
                    )}
                  </div>

                  {isEditing(m, carIndex) && (
                    <div style={{ padding: '1rem 1.25rem 1.25rem', borderTop: '0.5px solid rgba(0,0,0,0.06)', background: 'rgba(197,168,130,0.03)', borderBottom: i < brandGroups[brand].length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                      {/* Car fields */}
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 2fr', gap: '0.5rem', marginBottom: '1rem' }}>
                        {[['Year', 'year'], ['Make', 'make'], ['Model', 'model']].map(([label, field]) => (
                          <div key={field}>
                            <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.3rem' }}>{label}</div>
                            <input style={{ ...inp, padding: '0.5rem 0.7rem', fontSize: '12px' }} value={editForm[field]} onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))} />
                          </div>
                        ))}
                      </div>

                      {/* Mods */}
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.5rem' }}>Mods &amp; Packages</div>
                        {editForm.mods?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                            {editForm.mods.map((mod, mi) => (
                              <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(197,168,130,0.1)', border: '0.5px solid rgba(197,168,130,0.3)', padding: '2px 8px 2px 10px', fontSize: '11px', color: '#7B5B2E' }}>
                                {mod}
                                <button onClick={() => removeMod(mi)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', color: '#bbb', fontSize: '13px', lineHeight: 1, fontFamily: 'var(--font-inter),sans-serif' }}>×</button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <input
                            style={{ ...inp, padding: '0.45rem 0.7rem', fontSize: '12px', flex: 1 }}
                            placeholder="e.g. Stage 2 tune, Carbon hood, Exhaust…"
                            value={modDraft}
                            onChange={e => setModDraft(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addMod()}
                          />
                          <GhostBtn small onClick={addMod} disabled={!modDraft.trim()}>Add</GhostBtn>
                        </div>
                      </div>

                      <GhostBtn small onClick={saveCar} disabled={saving}>{saving ? 'Saving…' : 'Save'}</GhostBtn>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {unassigned.length > 0 && (
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
              <div style={{ padding: '0.85rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.07)', background: '#fafaf9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#bbb', letterSpacing: '0.02em' }}>Unassigned</div>
                <div style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{unassigned.length} member{unassigned.length !== 1 ? 's' : ''}</div>
              </div>
              {unassigned.map((m, i) => (
                <div key={m.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1.5fr 1fr', padding: '0.75rem 1.25rem', borderBottom: i < unassigned.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none', alignItems: 'center', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{m.name || <span style={{ color: '#ccc' }}>—</span>}</div>
                    {isMobile && <div style={{ fontSize: '11px', color: '#bbb', marginTop: '1px' }}>{m.email}</div>}
                  </div>
                  {!isMobile && <div style={{ fontSize: '12px', color: '#666' }}>{m.email}</div>}
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <input
                      style={{ ...inp, width: '120px', padding: '0.4rem 0.6rem', fontSize: '12px' }}
                      placeholder="Brand"
                      value={assignInputs[m.id] || ''}
                      onChange={e => setAssignInputs(p => ({ ...p, [m.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && assignCar(m, assignInputs[m.id] || '')}
                    />
                    <GhostBtn small onClick={() => assignCar(m, assignInputs[m.id] || '')} disabled={assigning[m.id]}>
                      {assigning[m.id] ? '…' : 'Assign'}
                    </GhostBtn>
                  </div>
                </div>
              ))}
            </div>
          )}

          {sortedBrands.length === 0 && unassigned.length === 0 && (
            <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No members yet.</div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

const TABS = ['Dashboard', 'Members', 'Cars', 'Applications', 'Contacts', 'Announcements', 'Events', 'Payments', 'Tools']
const TAB_ICONS = {
  Dashboard: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  Members: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Cars: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
    </svg>
  ),
  Applications: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  Contacts: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      <path d="M16 3.5 L19 6.5 L22 3.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Announcements: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Events: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Payments: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  Tools: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
}

function BirthdayCalendar({ people, onPersonClick }) {
  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear]   = useState(now.getFullYear())

  const birthdayMap = {}
  people.forEach(p => {
    if ((p.dob_month - 1) === viewMonth) {
      const d = p.dob_day
      if (!birthdayMap[d]) birthdayMap[d] = []
      birthdayMap[d].push(p)
    }
  })

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const todayDate   = new Date(); todayDate.setHours(0,0,0,0)
  const isThisMonth = todayDate.getMonth() === viewMonth && todayDate.getFullYear() === viewYear
  const todayDay    = todayDate.getDate()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function prev() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function next() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <button onClick={prev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '14px', padding: '0 4px', lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>{MONTHS[viewMonth].slice(0,3)} {viewYear}</span>
        <button onClick={next} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '14px', padding: '0 4px', lineHeight: 1 }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: '3px' }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', rowGap: '2px' }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const hasBday  = !!birthdayMap[d]
          const isToday  = isThisMonth && d === todayDay
          return (
            <div key={i} title={hasBday ? birthdayMap[d].map(p => p.name.split(' ')[0]).join(', ') : undefined}
              onClick={hasBday ? () => { if (birthdayMap[d]?.[0]) onPersonClick(birthdayMap[d][0]) } : undefined}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: hasBday ? 'pointer' : 'default', gap: '2px' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '20px', height: '20px', borderRadius: '50%', fontSize: '9px',
                fontFamily: 'var(--font-inter),sans-serif',
                color:      hasBday ? '#0F1E14' : isToday ? '#c5a882' : 'rgba(255,255,255,0.4)',
                background: hasBday ? '#c5a882'  : isToday ? 'rgba(197,168,130,0.15)' : 'transparent',
                fontWeight: hasBday ? '600' : '400',
                border:     isToday && !hasBday ? '1px solid #c5a882' : 'none',
              }}>{d}</span>
              {isToday && <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#c5a882', flexShrink: 0 }} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tools Tab ────────────────────────────────────────────────────────────────

function PaymentsTab({ isMobile }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('newest')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    fetch('/api/admin/applications')
      .then(r => r.json())
      .then(data => {
        const withPayment = (Array.isArray(data) ? data : [])
          .filter(a => a.stripe_payment_status || a.stripe_payment_intent_id)
        setPayments(withPayment)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const types = [...new Set(payments.map(p => p.stripe_payment_type).filter(Boolean))]

  const filtered = payments
    .filter(p => filterType === 'all' || p.stripe_payment_type === filterType)
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.stripe_paid_at || b.created_at) - new Date(a.stripe_paid_at || a.created_at)
      if (sortBy === 'oldest') return new Date(a.stripe_paid_at || a.created_at) - new Date(b.stripe_paid_at || b.created_at)
      if (sortBy === 'amount_desc') return (b.stripe_amount_paid || 0) - (a.stripe_amount_paid || 0)
      if (sortBy === 'amount_asc') return (a.stripe_amount_paid || 0) - (b.stripe_amount_paid || 0)
      return 0
    })

  const totalCents = payments
    .filter(p => p.stripe_payment_status === 'paid')
    .reduce((sum, p) => sum + (p.stripe_amount_paid || 0), 0)

  const paidCount = payments.filter(p => p.stripe_payment_status === 'paid').length
  const pendingCount = payments.filter(p => p.stripe_payment_status && p.stripe_payment_status !== 'paid').length

  const fmtAmount = cents => `$${(cents / 100).toFixed(2)}`
  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
  const fmtType = t => t ? t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'

  const statCard = (label, value, sub, color = '#1a1a1a') => (
    <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.25rem 1.4rem' }}>
      <div style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: '1.75rem', fontWeight: '300', color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.3rem' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: '#bbb', marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  )

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {statCard('Total Collected', fmtAmount(totalCents), `${paidCount} payment${paidCount !== 1 ? 's' : ''}`, '#1a1a1a')}
        {statCard('Paid', paidCount, null, '#3B6B2F')}
        {statCard('Other Status', pendingCount, null, pendingCount > 0 ? '#8A6535' : '#999')}
        {statCard('Records', payments.length, 'with Stripe data', '#1a1a1a')}
      </div>

      {/* Filters */}
      {!loading && payments.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              style={{ ...sel, width: '180px', fontSize: '11px', padding: '0.62rem 2rem 0.62rem 0.75rem' }}>
              <option value="all">All types</option>
              {types.map(t => <option key={t} value={t}>{fmtType(t)}</option>)}
            </select>
            <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div style={{ position: 'relative' }}>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ ...sel, width: '180px', fontSize: '11px', padding: '0.62rem 2rem 0.62rem 0.75rem' }}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount_desc">Amount ↓</option>
              <option value="amount_asc">Amount ↑</option>
            </select>
            <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : payments.length === 0 ? (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#bbb', marginBottom: '0.5rem' }}>No payments recorded yet.</div>
          <div style={{ fontSize: '12px', color: '#ccc', lineHeight: '1.7' }}>
            Payment data will appear here once Stripe is live and<br />
            the webhook is receiving <code>payment_intent.succeeded</code> events.
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', overflowX: 'auto' }}>
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.8fr 90px 130px 90px 130px', padding: '0.65rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf9' }}>
              {['Name', 'Email', 'Amount', 'Type', 'Status', 'Date'].map((h, i) => (
                <div key={i} style={{ fontSize: '10px', letterSpacing: '0.13em', textTransform: 'uppercase', color: '#999' }}>{h}</div>
              ))}
            </div>
          )}
          {filtered.map((p, idx) => {
            const isPaid = p.stripe_payment_status === 'paid'
            return (
              <div key={p.id} style={{ borderBottom: idx < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                {isMobile ? (
                  <div style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '13px', color: '#1a1a1a' }}>{p.name || <span style={{ color: '#ccc' }}>—</span>}</span>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: isPaid ? '#3B6B2F' : '#8A6535' }}>{p.stripe_amount_paid ? fmtAmount(p.stripe_amount_paid) : '—'}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{p.email}</div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{fmtType(p.stripe_payment_type)}</span>
                      <span style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: isPaid ? '#3B6B2F' : '#8A6535' }}>{p.stripe_payment_status || '—'}</span>
                      <span style={{ fontSize: '10px', color: '#bbb' }}>{fmtDate(p.stripe_paid_at)}</span>
                    </div>
                    {p.stripe_payment_intent_id && (
                      <div style={{ fontSize: '10px', color: '#ccc', marginTop: '0.25rem', fontFamily: 'monospace' }}>{p.stripe_payment_intent_id}</div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.8fr 90px 130px 90px 130px', padding: '0.85rem 1.25rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{p.name || <span style={{ color: '#ccc' }}>—</span>}</div>
                    <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      {p.email}<CopyBtn value={p.email} />
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: isPaid ? '#3B6B2F' : '#8A6535' }}>
                      {p.stripe_amount_paid ? fmtAmount(p.stripe_amount_paid) : '—'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {fmtType(p.stripe_payment_type)}
                    </div>
                    <div>
                      <span style={{
                        fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px',
                        background: isPaid ? 'rgba(59,107,47,0.08)' : 'rgba(138,101,53,0.08)',
                        color: isPaid ? '#3B6B2F' : '#8A6535',
                        border: `0.5px solid ${isPaid ? 'rgba(59,107,47,0.25)' : 'rgba(138,101,53,0.25)'}`,
                      }}>
                        {p.stripe_payment_status || '—'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{fmtDate(p.stripe_paid_at)}</div>
                  </div>
                )}
                {/* Intent ID row on desktop */}
                {!isMobile && p.stripe_payment_intent_id && (
                  <div style={{ padding: '0 1.25rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ fontSize: '10px', color: '#ccc', fontFamily: 'monospace', letterSpacing: '0.02em' }}>{p.stripe_payment_intent_id}</span>
                    <CopyBtn value={p.stripe_payment_intent_id} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Coming soon sections */}
      <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.5rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.75rem' }}>Stripe Dashboard</div>
          <div style={{ fontSize: '12px', color: '#999', lineHeight: '1.7', marginBottom: '1rem' }}>
            View payouts, disputes, and full transaction history directly in Stripe.
          </div>
          <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', border: '0.5px solid rgba(0,0,0,0.2)', padding: '0.45rem 1rem', textDecoration: 'none', display: 'inline-block', fontFamily: 'var(--font-inter),sans-serif' }}>
            Open Stripe →
          </a>
        </div>
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.5rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.75rem' }}>Refunds</div>
          <div style={{ fontSize: '12px', color: '#999', lineHeight: '1.7' }}>
            Refund processing will be available here once Stripe is fully configured with refund webhooks.
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ccc' }}>Coming soon</div>
        </div>
      </div>
    </div>
  )
}

function ToolsTab() {
  const [hcStatus, setHcStatus] = useState(null) // null | 'loading' | 'ok' | 'error'
  const [hcRuns, setHcRuns]     = useState([])   // last 4 workflow run objects
  const hcTimer = useRef(null)
  const refreshTimer = useRef(null)
  const [importRunning, setImportRunning] = useState(false)
  const [importResult, setImportResult] = useState(null)

  useEffect(() => {
    fetchRuns()
    return () => { clearTimeout(hcTimer.current); clearTimeout(refreshTimer.current) }
  }, [])

  function fetchRuns() {
    fetch('/api/admin/health-check')
      .then(r => r.ok ? r.json() : { runs: [] })
      .then(d => setHcRuns(d.runs || []))
      .catch(() => {})
  }

  async function runHealthCheck() {
    if (hcStatus === 'loading') return
    setHcStatus('loading')
    try {
      const res = await fetch('/api/admin/health-check', { method: 'POST' })
      setHcStatus(res.ok ? 'ok' : 'error')
      // GitHub takes ~8s to register a new run — refresh after that
      refreshTimer.current = setTimeout(fetchRuns, 8000)
    } catch {
      setHcStatus('error')
    }
    hcTimer.current = setTimeout(() => setHcStatus(null), 4000)
  }

  async function runImport() {
    setImportRunning(true)
    setImportResult(null)
    const res = await fetch('/api/admin/import-cc', { method: 'POST' })
    const d = await res.json().catch(() => ({ error: 'Invalid response' }))
    setImportResult(d)
    setImportRunning(false)
  }

  function dotColor(run) {
    if (!run) return 'rgba(0,0,0,0.1)'
    if (run.status === 'in_progress' || run.status === 'queued') return '#c5a882'
    if (run.conclusion === 'success') return '#3B6B2F'
    if (run.conclusion === 'failure' || run.conclusion === 'timed_out') return '#7B2032'
    return 'rgba(0,0,0,0.15)'
  }

  function dotLabel(run) {
    if (!run) return 'No data'
    const diff = Date.now() - new Date(run.created_at).getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor(diff / 60000)
    const age = h >= 24 ? `${Math.floor(h / 24)}d ago` : h >= 1 ? `${h}h ago` : `${m}m ago`
    const result = run.status !== 'completed' ? run.status : (run.conclusion || 'unknown')
    return `${age} · ${result}`
  }

  // Always show 4 dots — unfilled gray for slots with no data yet
  const dots = Array.from({ length: 4 }, (_, i) => hcRuns[i] || null)

  const tool = { heading: '#1a1a1a', sub: '#888', border: 'rgba(0,0,0,0.08)', bg: '#fff' }

  return (
    <div style={{ padding: 'clamp(1.25rem,4vw,2.5rem)', maxWidth: '680px' }}>
      <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#bbb', marginBottom: '2rem' }}>Tools</div>

      {/* Legacy Import */}
      <div style={{ marginTop: '2rem', padding: '1.75rem', border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '0.75rem' }}>Legacy Import</div>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '1rem', lineHeight: '1.6' }}>
          Import legacy Canvas Routes attendees into the applications table. This endpoint is gated by the <code>IMPORT_CC_ENABLED</code> environment variable.
        </div>
        <GhostBtn small onClick={runImport} disabled={importRunning}>{importRunning ? 'Importing…' : 'Run Import'}</GhostBtn>
        {importResult && <div style={{ marginTop: '0.75rem', fontSize: '12px', color: importResult.error ? '#7B2032' : '#3B6B2F' }}>{importResult.error || importResult.message || JSON.stringify(importResult)}</div>}
      </div>

      {/* Site Health Check */}
      <div style={{ border: `0.5px solid ${tool.border}`, background: tool.bg, padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            {/* Title + 4 status dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.35rem' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: tool.heading }}>Site Health Check</div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {dots.map((run, i) => (
                  <div
                    key={i}
                    title={dotLabel(run)}
                    style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: dotColor(run),
                      flexShrink: 0,
                      transition: 'background 0.4s',
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: tool.sub, lineHeight: '1.6', maxWidth: '380px' }}>
              Runs Playwright tests against all registration pages and APIs — route form, membership form, and member login. Scheduled automatically 4× daily. Results visible on GitHub Actions.
            </div>
            <a href="https://github.com/iamvishalrana/canvas-routes-next/actions/workflows/health-check.yml"
              target="_blank" rel="noreferrer"
              style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '11px', color: '#c5a882', textDecoration: 'none', letterSpacing: '0.04em' }}>
              View results on GitHub →
            </a>
          </div>
          <button onClick={runHealthCheck} disabled={hcStatus === 'loading'}
            style={{
              flexShrink: 0, padding: '0.6rem 1.25rem',
              background: hcStatus === 'ok' ? 'rgba(59,107,47,0.08)' : hcStatus === 'error' ? 'rgba(123,32,50,0.06)' : 'transparent',
              border: `0.5px solid ${hcStatus === 'ok' ? 'rgba(59,107,47,0.4)' : hcStatus === 'error' ? 'rgba(123,32,50,0.4)' : 'rgba(0,0,0,0.2)'}`,
              fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: hcStatus === 'ok' ? '#3B6B2F' : hcStatus === 'error' ? '#7B2032' : '#1a1a1a',
              cursor: hcStatus === 'loading' ? 'wait' : 'pointer',
              fontFamily: 'var(--font-inter),sans-serif', transition: 'all 0.2s',
            }}>
            {hcStatus === 'loading' ? 'Triggering…' : hcStatus === 'ok' ? 'Triggered ✓' : hcStatus === 'error' ? 'Failed ✗' : 'Run Now'}
          </button>
        </div>
      </div>

    </div>
  )
}

function AdminPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const rawTab = searchParams.get('tab')
  const tab = TABS.includes(rawTab) ? rawTab : 'Dashboard'
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unseenAppsCount, setUnseenAppsCount] = useState(0)
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([])
  const [allPeopleWithDob, setAllPeopleWithDob] = useState([])
  const [tabSearch, setTabSearch] = useState('')

  useEffect(() => { document.title = 'Admin — Canvas Routes' }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    async function fetchBirthdays() {
      try {
        const [mRes, cRes] = await Promise.all([
          fetch('/api/admin/members'),
          fetch('/api/admin/contacts'),
        ])
        const members = mRes.ok ? await mRes.json() : []
        const contacts = cRes.ok ? await cRes.json() : []
        const seen = new Set()
        const all = [
          ...(Array.isArray(members) ? members.map(m => ({ ...m, _source: 'Members' })) : []),
          ...(Array.isArray(contacts) ? contacts.map(c => ({ ...c, _source: 'Contacts' })) : []),
        ]
          .filter(p => {
            if (!p.dob_month || !p.dob_day || !p.name) return false
            const key = (p.email || p.id || p.name).toLowerCase()
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const in14 = new Date(today); in14.setDate(in14.getDate() + 14)
        setAllPeopleWithDob(all)
        const upcoming = all
          .map(p => {
            const bday = new Date(today.getFullYear(), p.dob_month - 1, p.dob_day)
            if (bday < today) bday.setFullYear(today.getFullYear() + 1)
            return { ...p, nextBirthday: bday }
          })
          .filter(p => p.nextBirthday <= in14)
          .sort((a, b) => a.nextBirthday - b.nextBirthday)
        setUpcomingBirthdays(upcoming)
      } catch {}
    }
    fetchBirthdays()
  }, [])

  async function signOut() {
    await createClient().auth.signOut()
    window.location.href = '/members/login'
  }

  function selectTab(t) {
    router.replace(`/admin?tab=${encodeURIComponent(t)}`, { scroll: false })
    setSidebarOpen(false)
  }

  function jumpToPerson(p) {
    setTabSearch(p.email || p.name || '')
    selectTab(p._source || 'Contacts')
  }

  const sidebarContent = (
    <>
      <div style={{ padding: '1.75rem 1.5rem 1.5rem', borderBottom: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Link href="/">
          <div style={{ width: '142px', height: '64px', overflow: 'hidden' }}>
            <Image src="/white-outline.png" alt="Canvas Routes" width={1024} height={1536}
              style={{ width: '142px', height: 'auto', marginTop: '-69px', display: 'block', opacity: 0.9 }} />
          </div>
        </Link>
        <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: '0.75rem' }}>Admin Panel</div>
      </div>

      <nav style={{ padding: '1.25rem 0', flex: 1 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => selectTab(t)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1.5rem', background: tab === t ? 'rgba(197,168,130,0.12)' : 'transparent',
              border: 'none', borderLeft: tab === t ? '2px solid #c5a882' : '2px solid transparent',
              cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif',
              fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: tab === t ? '#c5a882' : 'rgba(255,255,255,0.45)',
              textAlign: 'left', transition: 'color 0.15s, background 0.15s',
            }}>
            <span style={{ opacity: tab === t ? 1 : 0.5 }}>{TAB_ICONS[t]}</span>
            <span style={{ flex: 1 }}>{t}</span>
            {t === 'Applications' && unseenAppsCount > 0 && (
              <span style={{ minWidth: '18px', height: '18px', borderRadius: '9px', background: '#7B2032', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', fontWeight: '600', letterSpacing: 0 }}>{unseenAppsCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div style={{ padding: '1.1rem 1.5rem', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}>Birthdays</div>
        <BirthdayCalendar people={allPeopleWithDob} onPersonClick={jumpToPerson} />
        <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: '0.5rem', marginTop: '0.75rem' }}>Upcoming</div>
        {upcomingBirthdays.length === 0 ? (
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>None in the next 14 days</div>
        ) : upcomingBirthdays.map(m => {
          const today = new Date(); today.setHours(0, 0, 0, 0)
          const daysUntil = Math.round((m.nextBirthday - today) / 86400000)
          const isToday = daysUntil === 0
          return (
            <button key={m.id} onClick={() => jumpToPerson(m)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', background: 'none', border: 'none', padding: '0.35rem 0.5rem', margin: '0 -0.5rem 0.2rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.02em' }}>{m.name.split(' ')[0]}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m.dob_month - 1]} {m.dob_day}</div>
              </div>
              <div style={{ fontSize: '10px', color: isToday ? '#c5a882' : 'rgba(255,255,255,0.4)', letterSpacing: '0.02em' }}>
                {isToday ? 'Today' : `${daysUntil}d`}
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ padding: '1.25rem 1.5rem', borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <Link href="/members/dashboard" style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
          → Portal
        </Link>
        <Link href="/members/profile" style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
          → Profile
        </Link>
        <button onClick={signOut}
          style={{ background: 'none', border: '0.5px solid rgba(255,255,255,0.12)', padding: '0.45rem 0', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', marginTop: '0.25rem' }}>
          Sign Out
        </button>
      </div>
    </>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Mobile top bar */}
      {isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '56px', background: '#0F1E14', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', zIndex: 300, borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
          <Link href="/">
            <div style={{ width: '107px', height: '49px', overflow: 'hidden' }}>
              <Image src="/white-outline.png" alt="Canvas Routes" width={1024} height={1536}
                style={{ width: '107px', height: 'auto', marginTop: '-51px', display: 'block', opacity: 0.9 }} />
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c5a882' }}>{tab}</span>
            <button onClick={() => setSidebarOpen(o => !o)}
              style={{ background: 'none', border: '0.5px solid rgba(255,255,255,0.2)', padding: '0.45rem 0.6rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {sidebarOpen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ) : (
                <>
                  <span style={{ display: 'block', width: '18px', height: '1.5px', background: 'rgba(255,255,255,0.7)' }}/>
                  <span style={{ display: 'block', width: '18px', height: '1.5px', background: 'rgba(255,255,255,0.7)' }}/>
                  <span style={{ display: 'block', width: '18px', height: '1.5px', background: 'rgba(255,255,255,0.7)' }}/>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 298 }} />
      )}

      {/* Sidebar */}
      <aside style={{
        width: '220px', flexShrink: 0, background: '#0F1E14', display: 'flex', flexDirection: 'column',
        ...(isMobile ? {
          position: 'fixed', top: 0, left: sidebarOpen ? 0 : '-220px', height: '100vh',
          zIndex: 299, transition: 'left 0.25s ease', overflowY: 'auto',
        } : {
          height: '100vh', overflowY: 'auto',
        }),
      }}>
        {sidebarContent}
      </aside>

      {/* Main */}
      <main style={{ flex: 1, background: '#F5F1EC', overflowY: 'auto', ...(isMobile ? { paddingTop: '56px' } : {}) }}>
        <div style={{ padding: isMobile ? '1.75rem 1rem' : '3rem 2.5rem' }}>

          {/* Header */}
          <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: isMobile ? '1.6rem' : '2rem', fontWeight: '300', color: '#1a1a1a' }}>{tab}</div>
          </div>

          {tab === 'Dashboard' && <DashboardTab isMobile={isMobile} onNavigate={selectTab} />}
          {tab === 'Members' && <MembersTab isMobile={isMobile} searchOverride={tabSearch} onSearchOverrideConsumed={() => setTabSearch('')} />}
          {tab === 'Cars' && <CarsTab isMobile={isMobile} />}
          {tab === 'Applications' && <ApplicationsTab isMobile={isMobile} onUnseenCountChange={setUnseenAppsCount} />}
          {tab === 'Contacts' && <ContactsTab isMobile={isMobile} searchOverride={tabSearch} onSearchOverrideConsumed={() => setTabSearch('')} />}
          {tab === 'Announcements' && <AnnouncementsTab />}
          {tab === 'Events' && <EventsTab isMobile={isMobile} />}
          {tab === 'Payments' && <PaymentsTab isMobile={isMobile} />}
          {tab === 'Tools' && <ToolsTab />}

        </div>
      </main>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>}>
      <AdminPageInner />
    </Suspense>
  )
}
