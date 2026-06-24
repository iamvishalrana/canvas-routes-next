'use client'
import { useState, useEffect } from 'react'
import { EVENT_ATTENDANCE_KEYS, EVENT_NAME_ALIASES, normalizeEventName as _normalizeEventName } from '../../../lib/eventMeta.js'

// ── Constants ─────────────────────────────────────────────────────────────────

export const STATUS_OPTIONS = ['pending', 'active', 'suspended', 'expired']
export const CAR_YEARS = Array.from({ length: 2027 - 1940 + 1 }, (_, i) => 2027 - i)
export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const DOB_YEARS = Array.from({ length: 2015 - 1945 + 1 }, (_, i) => 2015 - i)
export const EMPTY_CAR = { year: '', make: '', model: '', license_plate: '', paint: '' }
export const STATUS_COLORS = {
  active:    { bg: 'rgba(59,107,47,0.1)',   text: '#3B6B2F', border: 'rgba(59,107,47,0.3)'   },
  pending:   { bg: 'rgba(197,168,130,0.15)', text: '#8A6535', border: 'rgba(197,168,130,0.45)' },
  suspended: { bg: 'rgba(123,32,50,0.1)',   text: '#7B2032', border: 'rgba(123,32,50,0.3)'   },
  expired:   { bg: 'rgba(0,0,0,0.05)',      text: '#999',    border: 'rgba(0,0,0,0.15)'      },
}
export const EVENT_TYPES = ['Road Trip', 'Cars & Coffee', 'Social', 'Track Day', 'Other']
export const CAR_MAKES = ['Acura','Alfa Romeo','Allard','Aston Martin','Audi','Bentley','BMW','Bugatti','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Ferrari','Fiat','Ford','Genesis','GMC','Honda','Hyundai','Infiniti','Isuzu','Jaguar','Jeep','Kia','Koenigsegg','Lamborghini','Land Rover','Lexus','Lincoln','Lotus','Maserati','Mazda','McLaren','Mercedes-Benz','Mercury','MINI','Mitsubishi','Nissan','Pagani','Pontiac','Porsche','Ram','Rimac','Rolls-Royce','Subaru','Toyota','Volkswagen','Volvo','Zenvo','Other']
export const CANONICAL_EVENTS = [
  { name: 'Cars & Coffee — May 9, 2026', date: '2026-05-09' },
  { name: 'Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026', date: '2026-05-23' },
  { name: 'Into the Laurentians — June 7, 2026', date: '2026-06-07' },
  { name: 'Cars, Coffee & Dad Jokes — June 20, 2026', date: '2026-06-20' },
]
export const MEMBER_ATTENDANCE_KEYS = EVENT_ATTENDANCE_KEYS
export const NAME_ALIASES = EVENT_NAME_ALIASES
export { _normalizeEventName as normalizeEventName }
export function parseCarMakeModel(combined) {
  const s = (combined || '').trim()
  if (!s) return { make: '', model: '' }
  for (const make of CAR_MAKES) {
    if (s.toLowerCase().startsWith(make.toLowerCase() + ' ')) return { make, model: s.slice(make.length).trim() }
    if (s.toLowerCase() === make.toLowerCase()) return { make, model: '' }
  }
  return { make: '', model: s }
}

// ── Base styles ───────────────────────────────────────────────────────────────

export const inp = {
  width: '100%', padding: '0.7rem 0.9rem',
  border: '1px solid rgba(0,0,0,0.14)', background: '#fff',
  fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
export const sel = { ...inp, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' }

// ── Base components ───────────────────────────────────────────────────────────

export function L({ children }) {
  return <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', marginBottom: '0.35rem' }}>{children}</div>
}

export function Badge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending
  return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 9px', border: `0.5px solid ${s.border}`, background: s.bg, color: s.text, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  )
}

export function SelectWrap({ value, onChange, options }) {
  return (
    <div style={{ position: 'relative' }}>
      <select style={sel} value={value} onChange={onChange}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  )
}

export function PrimaryBtn({ onClick, disabled, type = 'button', children }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ padding: '0.65rem 1.4rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', cursor: disabled ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  )
}

export function GhostBtn({ onClick, small, disabled, children }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ padding: small ? '0.35rem 0.8rem' : '0.65rem 1.2rem', background: 'transparent', color: '#555', border: '0.5px solid rgba(0,0,0,0.2)', fontSize: small ? '10px' : '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: disabled ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  )
}

export function DangerBtn({ onClick, small, disabled, children }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ padding: small ? '0.35rem 0.8rem' : '0.65rem 1.2rem', background: 'transparent', color: '#7B2032', border: '0.5px solid rgba(123,32,50,0.35)', fontSize: small ? '10px' : '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: disabled ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  )
}

export function ToggleSwitch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      style={{ position: 'relative', display: 'inline-block', width: '34px', height: '19px', background: checked ? '#0F1E14' : 'rgba(0,0,0,0.15)', border: 'none', borderRadius: '10px', cursor: disabled ? 'wait' : 'pointer', transition: 'background 0.18s', flexShrink: 0, padding: 0, verticalAlign: 'middle', opacity: disabled ? 0.55 : 1 }}
    >
      <span style={{ position: 'absolute', top: '2.5px', left: checked ? '17px' : '2.5px', width: '14px', height: '14px', background: '#fff', borderRadius: '50%', transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.25)', display: 'block', pointerEvents: 'none' }} />
    </button>
  )
}

export function AttendanceToggle({ value, onChange, disabled }) {
  const seg = (active, color, border, bg, label, newVal) => (
    <button type="button" onClick={() => onChange(active ? null : newVal)} disabled={disabled}
      style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', cursor: disabled ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', border: active ? `0.5px solid ${border}` : '0.5px solid rgba(0,0,0,0.14)', background: active ? bg : '#fff', color: active ? color : '#aaa', opacity: disabled ? 0.6 : 1 }}>
      {label}
    </button>
  )
  return (
    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
      {seg(value === true,  '#3B6B2F', '#3B6B2F',             'rgba(59,107,47,0.1)',  '✓ Attended', true)}
      {seg(value === false, '#7B2032', 'rgba(123,32,50,0.4)', 'rgba(123,32,50,0.08)', '✗ No-show',  false)}
    </div>
  )
}

export function Err({ msg }) {
  if (!msg) return null
  return <div style={{ fontSize: '12px', color: '#7B2032', marginTop: '0.6rem' }}>{msg}</div>
}

export function Success({ msg }) {
  if (!msg) return null
  return <div style={{ fontSize: '12px', color: '#3B6B2F', marginTop: '0.6rem' }}>{msg}</div>
}

export function CopyBtn({ value }) {
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

// ── Admin Notes Panel (shared by Members, Applications, Contacts) ──────────────

function parseAdminNotes(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return [{ id: 1, text: raw, createdAt: null }]
}

export function AdminNotesPanel({ initialNotes, onSave }) {
  const [notes, setNotes] = useState(() => parseAdminNotes(initialNotes))
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Re-sync when parent refreshes data
  useEffect(() => { setNotes(parseAdminNotes(initialNotes)) }, [initialNotes])

  async function addNote() {
    if (!draft.trim()) return
    const savedDraft = draft.trim()
    const updated = [...notes, { id: Date.now(), text: savedDraft, createdAt: new Date().toISOString() }]
    setNotes(updated)
    setDraft('')
    setSaving(true)
    try {
      await onSave(JSON.stringify(updated))
      setSaveError(null)
    } catch {
      setSaveError('Failed to save note.')
      setNotes(notes)
      setDraft(savedDraft)
    } finally {
      setSaving(false)
    }
  }

  async function deleteNote(id) {
    const previous = notes
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated)
    try {
      await onSave(JSON.stringify(updated))
      setSaveError(null)
    } catch {
      setSaveError('Failed to save note.')
      setNotes(previous)
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

// ── Pagination ────────────────────────────────────────────────────────────────

export function Pagination({ total, page, pageSize, onPageChange }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderTop: '0.5px solid rgba(0,0,0,0.07)', background: '#fff' }}>
      <span style={{ fontSize: '12px', color: '#999' }}>{from}–{to} of {total}</span>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          style={{ padding: '0.35rem 0.75rem', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', fontSize: '11px', color: page <= 1 ? '#ccc' : '#555', cursor: page <= 1 ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
          ←
        </button>
        <span style={{ padding: '0.35rem 0.75rem', fontSize: '12px', color: '#333', border: '0.5px solid rgba(0,0,0,0.1)', background: '#f7f7f5' }}>
          {page} / {totalPages}
        </span>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
          style={{ padding: '0.35rem 0.75rem', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', fontSize: '11px', color: page >= totalPages ? '#ccc' : '#555', cursor: page >= totalPages ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
          →
        </button>
      </div>
    </div>
  )
}
