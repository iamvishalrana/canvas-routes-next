'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { EVENT_ATTENDANCE_KEYS, EVENT_NAME_ALIASES, normalizeEventName as _normalizeEventName } from '../../../lib/eventMeta.js'
import { MONTREAL_TZ } from '../../../lib/mtlTime'
import { useErrorToast } from './ErrorToastProvider'

// ── Constants ─────────────────────────────────────────────────────────────────

export const STATUS_OPTIONS = ['pending', 'active', 'suspended', 'expired']
export const CAR_YEARS = Array.from({ length: 2027 - 1940 + 1 }, (_, i) => 2027 - i)
export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
export const DOB_YEARS = Array.from({ length: 2015 - 1945 + 1 }, (_, i) => 2015 - i)
export const EMPTY_CAR = { year: '', make: '', model: '', license_plate: '', paint: '' }
export const STATUS_COLORS = {
  active:    { bg: 'rgba(59,107,47,0.1)',   text: '#3B6B2F', border: 'rgba(59,107,47,0.3)'   },
  pending:   { bg: 'rgba(197,168,130,0.15)', text: '#8A6535', border: 'rgba(197,168,130,0.45)' },
  suspended: { bg: 'rgba(147,51,62,0.1)',   text: '#93333E', border: 'rgba(147,51,62,0.3)'   },
  expired:   { bg: 'rgba(0,0,0,0.05)',      text: '#999',    border: 'rgba(0,0,0,0.15)'      },
}
// 'Route' isn't offered here — that type is reserved for the `events` row
// ensureRouteEventLinked() (lib/routeEventLink.js) auto-creates for each
// road trip, which the Meets & Events admin tab now filters out entirely
// (EventsClient.jsx) since it's managed under Admin > Routes instead.
export const EVENT_TYPES = ['Cars & Coffee', 'Social', 'Track Day', 'Other']
export const TRIP_LENGTH_OPTIONS = ['Same Day', 'Overnight', 'Multiple Nights']
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
  width: '100%', padding: '0.5rem 0.75rem',
  border: '1px solid rgba(0,0,0,0.14)', background: '#fff',
  fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
  borderRadius: '8px',
}
export const sel = { ...inp, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' }

// ── Base components ───────────────────────────────────────────────────────────

export function L({ children }) {
  return <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', marginBottom: '0.35rem', fontFamily: 'var(--font-inter),sans-serif' }}>{children}</div>
}

export function Badge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending
  return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px', border: `0.5px solid ${s.border}`, background: s.bg, color: s.text, whiteSpace: 'nowrap', borderRadius: '99px', fontFamily: 'var(--font-inter),sans-serif' }}>
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

export function PrimaryBtn({ onClick, disabled, type = 'button', className = '', children }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`admin-btn${className ? ` ${className}` : ''}`}
      style={{ padding: '0.65rem 1.4rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', borderRadius: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', cursor: disabled ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  )
}

export function GhostBtn({ onClick, small, disabled, children }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="admin-btn"
      style={{ padding: small ? '0.35rem 0.8rem' : '0.65rem 1.2rem', background: 'transparent', color: '#555', border: '0.5px solid rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: small ? '10px' : '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: disabled ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  )
}

export function DangerBtn({ onClick, small, disabled, children }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="admin-btn"
      style={{ padding: small ? '0.35rem 0.8rem' : '0.65rem 1.2rem', background: 'transparent', color: '#93333E', border: '0.5px solid rgba(147,51,62,0.35)', borderRadius: '8px', fontSize: small ? '10px' : '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: disabled ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  )
}

// ── Kebab menu — collapses a row of actions into a single ⋮ button, for mobile ─
// items: [{ label, onClick, danger, disabled }]. Closes on outside click / Escape.

export function KebabMenu({ items }) {
  const [open, setOpen] = useState(false)
  // Panel position, computed from the button on open. The panel is rendered in
  // a portal to <body> (below) with fixed positioning so it escapes any
  // ancestor's overflow:hidden (which clipped it — e.g. the events list card)
  // AND any ancestor opacity (which made it render see-through — e.g. an
  // inactive route row at opacity 0.6). Neither could be fixed with z-index.
  const [coords, setCoords] = useState(null)
  const btnRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (!e.target.closest('[data-kebab-root]') && !e.target.closest('[data-kebab-panel]')) setOpen(false)
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    // The panel is fixed-positioned to a point computed at open time, so any
    // scroll/resize would leave it detached — just close it instead.
    function onReflow() { setOpen(false) }
    document.addEventListener('click', onDocClick)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onReflow, true)
    window.addEventListener('resize', onReflow)
    return () => {
      document.removeEventListener('click', onDocClick)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onReflow, true)
      window.removeEventListener('resize', onReflow)
    }
  }, [open])

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      // Right-align the panel to the button's right edge (matches the old
      // right:0 anchoring), dropped just below it.
      setCoords({ top: r.bottom + 4, right: Math.max(8, window.innerWidth - r.right) })
    }
    setOpen(p => !p)
  }

  const list = items.filter(Boolean)
  return (
    <div data-kebab-root style={{ position: 'relative', display: 'inline-block' }}>
      <button ref={btnRef} type="button" onClick={toggle} aria-label="More actions"
        style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: open ? 'rgba(197,168,130,0.18)' : 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.4)', borderRadius: '10px', cursor: 'pointer', padding: 0, WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" color="#8A6535"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
      </button>
      {open && coords && createPortal(
        <div data-kebab-panel style={{ position: 'fixed', top: coords.top, right: coords.right, zIndex: 1000, minWidth: '180px', maxWidth: 'calc(100vw - 1rem)', background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '12px', boxShadow: '0 6px 24px rgba(0,0,0,0.14)', overflow: 'hidden' }}>
          {list.map((it, i) => (
            <button key={i} type="button" disabled={it.disabled}
              onClick={() => { setOpen(false); it.onClick() }}
              style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: '44px', textAlign: 'left', padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: i < list.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none', fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', color: it.danger ? '#93333E' : '#333', cursor: it.disabled ? 'not-allowed' : 'pointer', opacity: it.disabled ? 0.4 : 1, fontFamily: 'var(--font-inter),sans-serif', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>
              {it.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Filter menu — single button showing the current selection, opening a
// small dropdown to switch — replaces a row of mutually-exclusive filter
// pill buttons all shown at once. Usage:
// <FilterMenu value={filter} onChange={setFilter} options={[{ id: 'all', label: 'All' }, ...]} />
export function FilterMenu({ options, value, onChange, compact, placeholder = 'Filter' }) {
  const [open, setOpen] = useState(false)
  // Left-anchored by default, but a button sitting near the right edge of a
  // narrow screen (common once several of these sit in one wrapped row) would
  // push a left-anchored panel off-screen — flip to right-anchored instead
  // when there isn't room, checked fresh each time the menu opens.
  const [align, setAlign] = useState('left')
  const rootRef = useRef(null)
  useEffect(() => {
    if (!open) return
    function onDocClick(e) { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDocClick); window.removeEventListener('keydown', onKey) }
  }, [open])
  const current = options.find(o => o.id === value)
  const isFiltered = value !== (options[0]?.id ?? 'all')
  function toggle() {
    if (!open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect()
      setAlign(rect.left + 210 > window.innerWidth - 8 ? 'right' : 'left')
    }
    setOpen(v => !v)
  }
  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button type="button" onClick={toggle}
        style={{ fontSize: compact ? '9px' : '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: compact ? '3px 8px' : '5px 11px', minHeight: compact ? '24px' : '30px', borderRadius: '99px', border: `0.5px solid ${isFiltered ? 'rgba(15,30,20,0.5)' : 'rgba(0,0,0,0.15)'}`, background: isFiltered ? '#0F1E14' : 'transparent', color: isFiltered ? '#F5F1EC' : '#666', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', display: 'inline-flex', alignItems: 'center', gap: '5px', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>
        {current?.label || placeholder}
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', [align]: 0, zIndex: 30, minWidth: '210px', maxWidth: 'calc(100vw - 1.5rem)', background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '10px', boxShadow: '0 6px 24px rgba(0,0,0,0.14)', overflow: 'hidden' }}>
          {options.map((o, i) => (
            <button key={o.id} type="button" onClick={() => { onChange(o.id); setOpen(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', minHeight: '40px', padding: '0.6rem 0.9rem', background: value === o.id ? 'rgba(15,30,20,0.05)' : 'none', border: 'none', borderBottom: i < options.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none', fontSize: '12px', color: value === o.id ? '#0F1E14' : '#444', fontWeight: value === o.id ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Date range menu — a calendar icon that opens a small popover with the
// actual from/to date inputs, instead of showing two date inputs + a
// separator + a clear button inline all the time. Usage:
// <DateRangeMenu label="Applied" from={appliedFrom} to={appliedTo} onFromChange={setAppliedFrom} onToChange={setAppliedTo} />
// Pass onClear when from/to are backed by a single combined setter (e.g. a
// pushQuery-style URL-diffing pattern) — calling onFromChange('') then
// onToChange('') separately in that case can race (the second call reads a
// stale snapshot from before the first's URL update lands), so this never
// assumes two independent setters are safe to call back to back.
export function DateRangeMenu({ label = 'Date range', from, to, onFromChange, onToChange, onClear, maxDate }) {
  const [open, setOpen] = useState(false)
  // Same right-edge flip as FilterMenu — this popover is wider (240px) and
  // sits in the same filter rows, so it's at least as likely to overflow.
  const [align, setAlign] = useState('left')
  const rootRef = useRef(null)
  useEffect(() => {
    if (!open) return
    function onDocClick(e) { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDocClick); window.removeEventListener('keydown', onKey) }
  }, [open])
  const active = !!(from || to)
  const rangeInp = { padding: '0.5rem 0.55rem', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-inter),sans-serif', width: '116px' }
  function toggle() {
    if (!open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect()
      setAlign(rect.left + 240 > window.innerWidth - 8 ? 'right' : 'left')
    }
    setOpen(v => !v)
  }
  return (
    <div ref={rootRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button type="button" onClick={toggle} aria-label={label}
        title={active ? `${label}: ${from || '…'} – ${to || '…'}` : label}
        style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '99px', border: `0.5px solid ${active ? 'rgba(15,30,20,0.5)' : 'rgba(0,0,0,0.15)'}`, background: active ? '#0F1E14' : 'transparent', color: active ? '#F5F1EC' : '#666', cursor: 'pointer', padding: 0, WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', [align]: 0, zIndex: 30, background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '10px', boxShadow: '0 6px 24px rgba(0,0,0,0.14)', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: '240px', maxWidth: 'calc(100vw - 1.5rem)' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', fontFamily: 'var(--font-inter),sans-serif' }}>{label}</div>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input type="date" value={from} max={to || maxDate || undefined} onChange={e => onFromChange(e.target.value)} aria-label={`${label} from`} style={rangeInp} />
            <span style={{ fontSize: '11px', color: '#bbb', fontFamily: 'var(--font-inter),sans-serif' }}>–</span>
            <input type="date" value={to} min={from || undefined} max={maxDate || undefined} onChange={e => onToChange(e.target.value)} aria-label={`${label} to`} style={rangeInp} />
          </div>
          {active && (
            <button type="button" onClick={() => onClear ? onClear() : (onFromChange(''), onToChange(''))}
              style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#8A6535', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', padding: '4px 0', textDecoration: 'underline', minHeight: '30px' }}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Confirm dialog — yes/no gate for sends, deletes, and money actions ─────────
// Usage: {confirm && <ConfirmDialog title="Send invite?" message="…" onConfirm={…} onCancel={() => setConfirm(null)} />}

export function ConfirmDialog({ title, message, details, confirmLabel = 'Yes, continue', cancelLabel = 'Cancel', danger, busy, onConfirm, onCancel }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  return (
    <div className="admin-modal-overlay" onClick={() => { if (!busy) onCancel() }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,30,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="admin-modal-enter" role="alertdialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}
        style={{ background: '#fff', width: '100%', maxWidth: '440px', border: '0.5px solid rgba(0,0,0,0.12)', borderTop: `2px solid ${danger ? '#93333E' : '#45643c'}`, boxShadow: '0 12px 40px rgba(15,30,20,0.25)', maxHeight: '90dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '16px' }}>
        <div style={{ padding: '1.4rem 1.5rem 1.25rem' }}>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a', marginBottom: message ? '0.5rem' : 0, fontFamily: 'var(--font-inter),sans-serif' }}>{title}</div>
          {message && <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.65', fontFamily: 'var(--font-inter),sans-serif' }}>{message}</div>}
          {details && (
            <div style={{ marginTop: '0.85rem', padding: '0.75rem 0.9rem', background: 'rgba(0,0,0,0.03)', border: '0.5px solid rgba(0,0,0,0.07)', fontSize: '12px', color: '#444', lineHeight: '1.7', fontFamily: 'var(--font-inter),sans-serif' }}>
              {details}
            </div>
          )}
        </div>
        <div className="admin-confirm-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0 1.5rem calc(1.4rem + env(safe-area-inset-bottom))' }}>
          <GhostBtn onClick={onCancel} disabled={busy}>{cancelLabel}</GhostBtn>
          <button type="button" onClick={onConfirm} disabled={busy} className="admin-btn"
            style={{ padding: '0.65rem 1.4rem', minHeight: '44px', background: danger ? '#93333E' : '#45643c', color: '#F5F1EC', border: 'none', borderRadius: '8px', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', cursor: busy ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Animated count-up for stat numbers ─────────────────────────────────────────

export function CountUp({ value, duration = 700, format }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const target = Number(value)
    if (!Number.isFinite(target)) { setDisplay(value); return }
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(target); return
    }
    let raf
    const start = performance.now()
    function tick(now) {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(target * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  const n = Number.isFinite(Number(display)) ? display : value
  return <>{format ? format(n) : Math.round(n).toLocaleString()}</>
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

// value: true (attended) | false (no-show) | 'na' (not eligible — event
// predates them, tier-restricted, etc.) | null/undefined (never marked).
// Attendance tracking is opt-in — anything not explicitly marked attended or
// no-show counts as N/A, so the N/A segment shows active for 'na' AND for
// null/undefined, not just an explicit 'na'. 'na' is a plain string
// sentinel, never confused with the false/no-show boolean — every read of
// .attended / event_attendance elsewhere in the app uses a strict
// === true / === false comparison, so 'na' (or an unset value) safely falls
// through as "not counted" anywhere that isn't this toggle itself.
export function AttendanceToggle({ value, onChange, disabled }) {
  const seg = (active, color, border, bg, label, newVal) => (
    <button type="button" onClick={() => onChange(active ? null : newVal)} disabled={disabled}
      style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', cursor: disabled ? 'wait' : 'pointer', fontFamily: 'var(--font-inter),sans-serif', border: active ? `0.5px solid ${border}` : '0.5px solid rgba(0,0,0,0.14)', background: active ? bg : '#fff', color: active ? color : '#aaa', opacity: disabled ? 0.6 : 1, borderRadius: '99px' }}>
      {label}
    </button>
  )
  return (
    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, flexWrap: 'wrap' }}>
      {seg(value === true,  '#3B6B2F', '#3B6B2F',             'rgba(59,107,47,0.1)',  '✓ Attended', true)}
      {seg(value === false, '#93333E', 'rgba(147,51,62,0.4)', 'rgba(147,51,62,0.08)', '✗ No-show',  false)}
      {seg(value !== true && value !== false, '#777', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.06)', 'N/A', 'na')}
    </div>
  )
}

// Every admin page's inline "something failed" message goes through this one
// component (`<Err msg={...} />`, used identically everywhere), which is why
// it can become a global popup for the whole admin panel just by changing
// what happens here — no call site needs to change. Renders nothing itself;
// pushes into the fixed toast stack (ErrorToastProvider, mounted once in
// AdminShell) instead. The ref guards against re-pushing the same message
// on every re-render — only a genuinely NEW error value fires a new toast.
export function Err({ msg }) {
  const { pushError } = useErrorToast()
  const lastShown = useRef(null)
  useEffect(() => {
    if (msg && msg !== lastShown.current) {
      pushError(msg)
      lastShown.current = msg
    } else if (!msg) {
      lastShown.current = null
    }
  }, [msg, pushError])
  return null
}

export function Success({ msg }) {
  if (!msg) return null
  return <div style={{ fontSize: '12px', color: '#3B6B2F', marginTop: '0.6rem', fontFamily: 'var(--font-inter),sans-serif' }}>{msg}</div>
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

// Every email display in Members/Applications/Contacts routes through this —
// clicking it jumps to Broadcasts with that address pre-loaded as a Specific
// Email recipient (see the ?email= param handling in BroadcastsClient.jsx).
// Same-tab navigation on purpose: the admin panel runs as an installed iOS
// home-screen app (no tab bar), and target="_blank" there kicks the user out
// to Safari instead of opening a second in-app view — same-tab is the only
// option that behaves consistently in both that PWA context and a normal
// browser tab. color:inherit so it drops into whatever text color each
// caller already uses; the underline is what signals it's clickable.
export function EmailLink({ email }) {
  if (!email) return null
  return (
    <Link href={`/admin/broadcasts?email=${encodeURIComponent(email)}`}
      title="Email via Broadcasts"
      // Every call site sits inside a row that toggles expand/collapse (or
      // similar) on its own onClick — without this, clicking the email
      // bubbles up and fires that too, flashing the row open right before
      // navigation carries it away. Doesn't affect Next's own click handling
      // on this same Link (that's a separate listener on the same element).
      onClick={e => e.stopPropagation()}
      style={{ color: 'inherit', textDecoration: 'underline', textDecorationColor: 'rgba(0,0,0,0.18)', textUnderlineOffset: '2px' }}>
      {email}
    </Link>
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
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: MONTREAL_TZ })
  }

  return (
    <div>
      <div style={{ fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.65rem', fontFamily: 'var(--font-inter),sans-serif' }}>Admin Notes</div>
      {notes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
          {notes.map(note => (
            <div key={note.id} style={{ background: 'rgba(0,0,0,0.03)', border: '0.5px solid rgba(0,0,0,0.07)', padding: '0.6rem 0.75rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', color: '#333', lineHeight: '1.6', marginBottom: '0.3rem', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-inter),sans-serif' }}>{note.text}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: '#bbb', fontFamily: 'var(--font-inter),sans-serif' }}>{note.createdAt ? fmt(note.createdAt) : ''}</span>
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
      <span style={{ fontSize: '12px', color: '#999', fontFamily: 'var(--font-inter),sans-serif' }}>{from}–{to} of {total}</span>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          style={{ padding: '0.35rem 0.75rem', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '11px', color: page <= 1 ? '#ccc' : '#555', cursor: page <= 1 ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
          ←
        </button>
        <span style={{ padding: '0.35rem 0.75rem', fontSize: '12px', color: '#333', border: '0.5px solid rgba(0,0,0,0.1)', background: '#f7f7f5', borderRadius: '8px', fontFamily: 'var(--font-inter),sans-serif' }}>
          {page} / {totalPages}
        </span>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
          style={{ padding: '0.35rem 0.75rem', background: 'transparent', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '11px', color: page >= totalPages ? '#ccc' : '#555', cursor: page >= totalPages ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
          →
        </button>
      </div>
    </div>
  )
}
