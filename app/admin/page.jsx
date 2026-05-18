'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback, useRef } from 'react'
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
const CANONICAL_EVENTS = [
  { name: 'Cars & Coffee — May 9, 2026', date: '2026-05-09' },
  { name: 'Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026', date: '2026-05-23' },
  { name: 'Into the Laurentians — May 31, 2026', date: '2026-05-31' },
]
const MEMBER_ATTENDANCE_KEYS = {
  'Cars & Coffee — May 9, 2026': 'cc_may9',
  'Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026': 'gp_may23',
  'Into the Laurentians — May 31, 2026': 'laurentians_may31',
}
const NAME_ALIASES = {
  'Grand Prix Weekend Cars & Coffee — May 23, 2026': 'Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026',
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

// ─── Members Tab ─────────────────────────────────────────────────────────────

function MembersTab({ isMobile }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editCars, setEditCars] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', membership_status: 'pending' })
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [appData, setAppData] = useState(null)
  const [appLookupEmail, setAppLookupEmail] = useState('')
  const [actionError, setActionError] = useState(null)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)

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
    if (!confirm(`Delete ${m.name || m.email}? This permanently removes them from Canvas Routes.`)) return
    setActionError(null)
    const res = await fetch(`/api/admin/members/${m.id}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json(); setActionError(d.error || 'Failed to delete.'); return }
    load()
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
    setInviteForm({ name: '', email: '', membership_status: 'pending' })
    setAppData(null)
    setAppLookupEmail('')
    load()
    setTimeout(() => setInviteSuccess(false), 4000)
  }

  const filtered = members.filter(m =>
    !search || [m.name, m.email, m.membership_status].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  function exportCSV() {
    const rows = members.map(m => ({
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
        <form onSubmit={invite} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr 180px auto', gap: '0.75rem', alignItems: 'end' }}>
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
          <PrimaryBtn type="submit" disabled={inviting}>{inviting ? 'Sending…' : 'Send Invite'}</PrimaryBtn>
        </form>
        {appData && (
          <div style={{ marginTop: '0.75rem', fontSize: '12px', color: '#3B6B2F', background: 'rgba(59,107,47,0.07)', border: '0.5px solid rgba(59,107,47,0.25)', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3B6B2F" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Application found — <strong>{appData.name}</strong>{appData.car_year ? ` · ${appData.car_year} ${appData.car_model}` : ''}{appData.dob_month ? ` · DOB ${appData.dob_month}/${appData.dob_day}${appData.dob_year ? `/${appData.dob_year}` : ''}` : ''}. Profile will be pre-populated on invite.
          </div>
        )}
        <Err msg={inviteError} />
        <Success msg={inviteSuccess ? 'Invite sent successfully.' : null} />
      </div>

      {/* Member List */}
      {actionError && <Err msg={actionError} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999' }}>
            {filtered.length} of {members.length} member{members.length !== 1 ? 's' : ''}
          </div>
          {members.length > 0 && (
            <button onClick={exportCSV} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
              Export CSV
            </button>
          )}
        </div>
        <div style={{ position: 'relative', width: isMobile ? '100%' : '340px' }}>
          <input style={{ ...inp, width: '100%', paddingRight: search ? '2rem' : undefined }} placeholder="Search name, email, status…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: '16px', lineHeight: 1, padding: '2px', fontFamily: 'var(--font-inter),sans-serif' }}>×</button>}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : (
        <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.5fr 0.9fr 1fr 1fr 0.85fr', padding: '0.65rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf9' }}>
            {['Name', 'Email', 'Status', 'Car', 'Setup', ''].map((h, i) => (
              <div key={i} style={{ fontSize: '10px', letterSpacing: '0.13em', textTransform: 'uppercase', color: '#999' }}>{h}</div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No members found.</div>
          )}

          {filtered.map((m, idx) => (
            <div key={m.id} style={{ borderBottom: idx < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
              {editing === m.id ? (
                <div style={{ padding: '1.5rem 1.25rem', background: 'rgba(197,168,130,0.05)', borderLeft: '2px solid #c5a882' }}>

                  {/* Email + Status row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <L>Email (changes login email)</L>
                      <input style={inp} type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div>
                      <L>Status</L>
                      <SelectWrap value={editForm.membership_status} onChange={e => setEditForm(p => ({ ...p, membership_status: e.target.value }))} options={STATUS_OPTIONS} />
                    </div>
                  </div>

                  {/* Personal info row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div><L>Name</L><input style={inp} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
                    <div><L>Phone</L><input style={inp} type="tel" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} /></div>
                    <div><L>Instagram</L><input style={inp} value={editForm.instagram} onChange={e => setEditForm(p => ({ ...p, instagram: e.target.value }))} placeholder="@handle" /></div>
                  </div>

                  {/* DOB row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 3fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
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
                    <div key={cidx} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 120px auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'end' }}>
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
                  <div
                    style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.5fr 0.9fr 1fr 1fr 0.85fr', padding: '0.9rem 1.25rem', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                  >
                    <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{m.name || <span style={{ color: '#ccc' }}>No name</span>}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{m.email}</div>
                    <div><Badge status={m.membership_status} /></div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {m.cars?.length > 0
                        ? [m.cars[0].year, m.cars[0].make, m.cars[0].model].filter(Boolean).join(' ') || <span style={{ color: '#ddd' }}>—</span>
                        : [m.car_year, m.car_make, m.car_model].filter(Boolean).join(' ') || <span style={{ color: '#ddd' }}>—</span>
                      }
                      {m.cars?.length > 1 && <span style={{ fontSize: '10px', color: '#c5a882', marginLeft: '0.4rem' }}>+{m.cars.length - 1}</span>}
                    </div>
                    <div>
                      {m.password_set_at ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3B6B2F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          <span style={{ fontSize: '11px', color: '#3B6B2F' }}>{new Date(m.password_set_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#bbb', letterSpacing: '0.05em' }}>Awaiting</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }} onClick={e => e.stopPropagation()}>
                      <GhostBtn onClick={() => startEdit(m)} small>Edit</GhostBtn>
                      <DangerBtn onClick={() => deleteMember(m)} small>Delete</DangerBtn>
                    </div>
                  </div>

                  {expanded === m.id && (
                    <div style={{ padding: '1.25rem', background: 'rgba(197,168,130,0.04)', borderTop: '0.5px solid rgba(0,0,0,0.05)', borderLeft: '2px solid #c5a882' }}>
                      <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.6rem' }}>Event Attendance</div>
                      {(() => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        return CANONICAL_EVENTS.map(ev => {
                          const key = MEMBER_ATTENDANCE_KEYS[ev.name] || ev.name
                          const attended = m.event_attendance?.[key]
                          const isPast = new Date(ev.date) <= today
                          return (
                            <div key={ev.name} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12px', color: '#444', minWidth: '260px' }}>{ev.name}</span>
                              {isPast ? (
                                <>
                                  <button onClick={() => toggleMemberAttendance(m, ev.name, true)}
                                    style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', border: attended === true ? '0.5px solid #3B6B2F' : '0.5px solid rgba(0,0,0,0.14)', background: attended === true ? 'rgba(59,107,47,0.1)' : 'transparent', color: attended === true ? '#3B6B2F' : '#888' }}>
                                    ✓ Attended
                                  </button>
                                  <button onClick={() => toggleMemberAttendance(m, ev.name, false)}
                                    style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', border: attended === false ? '0.5px solid #7B2032' : '0.5px solid rgba(0,0,0,0.14)', background: attended === false ? 'rgba(123,32,50,0.08)' : 'transparent', color: attended === false ? '#7B2032' : '#888' }}>
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
  const [form, setForm] = useState({ title: '', content: '', published: false })
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

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
    setForm({ title: '', content: '', published: false })
    load()
  }

  async function togglePublish(item) {
    await fetch(`/api/admin/announcements/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: !item.published }),
    })
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
    if (!confirm('Delete this announcement?')) return
    const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
    if (!res.ok) { alert('Failed to delete.'); return }
    load()
  }

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

      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No announcements yet.</div>
      ) : (
        <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff' }}>
          {items.map((item, idx) => (
            <div key={item.id} style={{ padding: '1.5rem', borderBottom: idx < items.length - 1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none' }}>
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
                    </div>
                    <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>{item.content}</div>
                    <div style={{ fontSize: '11px', color: '#ccc', marginTop: '0.5rem' }}>
                      {new Date(item.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <GhostBtn onClick={() => togglePublish(item)} small>{item.published ? 'Unpublish' : 'Publish'}</GhostBtn>
                    <GhostBtn onClick={() => { setEditing(item.id); setEditForm({ title: item.title, content: item.content }); setSaveError(null) }} small>Edit</GhostBtn>
                    <DangerBtn onClick={() => del(item.id)} small>Delete</DangerBtn>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Events Tab ───────────────────────────────────────────────────────────────

function EventsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', date: '', location: '', description: '', type: 'Road Trip' })
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

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
    setForm({ name: '', date: '', location: '', description: '', type: 'Road Trip' })
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
    if (!confirm('Delete this event?')) return
    const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
    if (!res.ok) { alert('Failed to delete.'); return }
    load()
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem', padding: '1.75rem', border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1.25rem' }}>New Event</div>
        <form onSubmit={post}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 150px', gap: '0.75rem', marginBottom: '0.75rem' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 150px', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div><L>Name</L><input style={inp} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
                    <div><L>Date</L><input style={inp} value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} /></div>
                    <div><L>Type</L><SelectWrap value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))} options={EVENT_TYPES} /></div>
                  </div>
                  <div style={{ marginBottom: '0.6rem' }}><L>Location</L><input style={inp} value={editForm.location || ''} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} /></div>
                  <div style={{ marginBottom: '0.75rem' }}><L>Description</L><textarea style={{ ...inp, height: '80px', resize: 'vertical' }} value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <PrimaryBtn onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</PrimaryBtn>
                    <GhostBtn onClick={() => setEditing(null)}>Cancel</GhostBtn>
                  </div>
                  <Err msg={saveError} />
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '500', color: '#1a1a1a' }}>{item.name}</div>
                      <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A6535', border: '0.5px solid rgba(197,168,130,0.45)', padding: '2px 7px' }}>{item.type}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#c5a882', fontWeight: '500', marginBottom: '0.25rem' }}>{item.date}</div>
                    {item.location && <div style={{ fontSize: '12px', color: '#888' }}>{item.location}</div>}
                    {item.description && <div style={{ fontSize: '12px', color: '#777', marginTop: '0.3rem', lineHeight: '1.55' }}>{item.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <GhostBtn onClick={() => { setEditing(item.id); setEditForm({ name: item.name, date: item.date, location: item.location || '', description: item.description || '', type: item.type }); setSaveError(null) }} small>Edit</GhostBtn>
                    <DangerBtn onClick={() => del(item.id)} small>Delete</DangerBtn>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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
    if (!confirm(`Delete application from ${app.name || app.email}? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/applications/${app.id}`, { method: 'DELETE' })
    if (res.ok) { setExpanded(null); setEditingApp(null); loadApps() }
    else alert('Failed to delete.')
  }

  function startEditApp(a) {
    setEditingApp(a.id)
    setSaveAppErr(null)
    setEditAppForm({
      name: a.name || '',
      car_year: a.car_year || '',
      car_model: a.car_model || '',
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

  async function sendInvite(app) {
    setInviting(app.id)
    const payload = {
      name: app.name, email: app.email, membership_status: 'pending',
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
    .filter(a => !search || [a.name, a.email, a.car_year, a.car_model, a.source].some(v => v?.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      if (sortApps === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (sortApps === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sortApps === 'name_az') return (a.name || '').localeCompare(b.name || '')
      if (sortApps === 'name_za') return (b.name || '').localeCompare(a.name || '')
      return 0
    })
  const totalInvited = apps.filter(a => a.is_member).length
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
          { label: 'New', value: unseenCount, color: unseenCount > 0 ? '#7B2032' : '#999' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.25rem 1.4rem' }}>
            <div style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: '2rem', fontWeight: '300', color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.3rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999' }}>
          {filtered.length} of {apps.length} application{apps.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: isMobile ? '100%' : undefined }}>
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
        <div style={{ overflowX: 'auto' }}>
        <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff', minWidth: '700px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1.2fr 0.8fr 90px 110px', padding: '0.65rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf9' }}>
            {['Name', 'Email', 'Car', 'DOB', 'Date', ''].map((h, i) => (
              <div key={i} style={{ fontSize: '10px', letterSpacing: '0.13em', textTransform: 'uppercase', color: '#999' }}>{h}</div>
            ))}
          </div>

          {filtered.map((a, idx) => (
            <div key={a.id} style={{ borderBottom: idx < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
              {/* Summary row */}
              {(() => {
                const isGreyed = a.is_contact && !a.reregistered_at
                return (
                <div
                  style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1.2fr 0.8fr 90px 110px', padding: '0.85rem 1.25rem', alignItems: 'center', cursor: 'pointer', background: isGreyed ? 'rgba(0,0,0,0.025)' : undefined }}
                  onClick={() => {
                    setExpanded(expanded === a.id ? null : a.id)
                    if (editingApp === a.id) setEditingApp(null)
                    markSeen(a.id)
                    if (a.reregistered_at) {
                      setApps(prev => prev.map(x => x.id === a.id ? { ...x, reregistered_at: null } : x))
                      fetch(`/api/admin/applications/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reregistered_at: null }) })
                    }
                  }}
                >
                  <div style={{ fontSize: '13px', color: isGreyed ? '#bbb' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {!seenAppIds.has(a.id) && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#7B2032', flexShrink: 0, display: 'inline-block' }} />}
                    {a.reregistered_at && <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c5a882', border: '0.5px solid rgba(197,168,130,0.5)', padding: '2px 6px', background: 'rgba(197,168,130,0.08)', whiteSpace: 'nowrap', flexShrink: 0 }}>↩ Re-registered</span>}
                    {a.name || <span style={{ color: '#ccc' }}>—</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: isGreyed ? '#bbb' : '#666', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>{a.email}<CopyBtn value={a.email} /></div>
                  <div style={{ fontSize: '12px', color: isGreyed ? '#bbb' : '#888' }}>
                    {[a.car_year, a.car_model].filter(Boolean).join(' ') || <span style={{ color: '#ddd' }}>—</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: isGreyed ? '#bbb' : '#888' }}>
                    {a.dob_month ? `${MONTHS_SHORT[a.dob_month - 1]} ${a.dob_day}${a.dob_year ? `, ${a.dob_year}` : ''}` : <span style={{ color: '#ddd' }}>—</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#bbb' }}>
                    {new Date(a.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    {a.is_member || inviteStatus[a.id] === 'success' ? (
                      <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.3)', padding: '3px 9px', background: 'rgba(59,107,47,0.07)' }}>Invited</span>
                    ) : (
                      <div>
                        <PrimaryBtn onClick={() => sendInvite(a)} disabled={inviting === a.id}>
                          {inviting === a.id ? '…' : 'Invite'}
                        </PrimaryBtn>
                        {inviteStatus[a.id] && inviteStatus[a.id] !== 'success' && (
                          <div style={{ fontSize: '10px', color: '#7B2032', marginTop: '0.3rem' }}>{inviteStatus[a.id]}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                )
              })()}

              {/* Expanded panel */}
              {expanded === a.id && (
                <div style={{ padding: '1.25rem', background: 'rgba(197,168,130,0.04)', borderTop: '0.5px solid rgba(0,0,0,0.05)', borderLeft: '2px solid #c5a882' }}>

                  {editingApp === a.id ? (
                    /* ── Edit mode ── */
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 90px 1.5fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                        <div><L>Name</L><input style={inp} value={editAppForm.name} onChange={e => setEditAppForm(p => ({ ...p, name: e.target.value }))} /></div>
                        <div><L>Car Year</L><input style={inp} value={editAppForm.car_year} onChange={e => setEditAppForm(p => ({ ...p, car_year: e.target.value }))} placeholder="e.g. 2019" maxLength={10} /></div>
                        <div><L>Car Make & Model</L><input style={inp} value={editAppForm.car_model} onChange={e => setEditAppForm(p => ({ ...p, car_model: e.target.value }))} placeholder="e.g. BMW M3" maxLength={100} /></div>
                        <div><L>Phone</L><input style={inp} type="tel" value={editAppForm.phone} onChange={e => setEditAppForm(p => ({ ...p, phone: e.target.value }))} maxLength={30} /></div>
                        <div><L>Instagram</L><input style={inp} value={editAppForm.instagram} onChange={e => setEditAppForm(p => ({ ...p, instagram: e.target.value }))} placeholder="handle" maxLength={50} /></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                        <InfoCell label="Name" value={a.name} />
                        <InfoCell label="Car Year" value={a.car_year} />
                        <InfoCell label="Car Make & Model" value={a.car_model} />
                        <InfoCell label="Phone" value={a.phone} copyable />
                        <InfoCell label="Instagram" value={a.instagram ? `@${a.instagram}` : null} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
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
                            <span style={{ fontSize: '12px', color: '#444', minWidth: '260px' }}>{eventName}</span>
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

                  {/* Action row */}
                  {editingApp !== a.id && (
                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {!a.is_contact ? (
                        <GhostBtn onClick={() => addToContact(a.id)} small disabled={addingContact.has(a.id)}>
                          {addingContact.has(a.id) ? '…' : 'Add to Contacts'}
                        </GhostBtn>
                      ) : (
                        <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', border: '0.5px solid rgba(59,107,47,0.3)', padding: '3px 9px', background: 'rgba(59,107,47,0.07)' }}>✓ In Contacts</span>
                      )}
                      <GhostBtn onClick={() => startEditApp(a)} small>Edit</GhostBtn>
                      <DangerBtn onClick={() => deleteApp(a)} small>Delete</DangerBtn>
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

// ─── Contacts Tab ────────────────────────────────────────────────────────────

function ContactsTab({ isMobile }) {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [search, setSearch] = useState('')
  const [sortContacts, setSortContacts] = useState('name_az')
  const [selected, setSelected] = useState(new Set())

  const loadContacts = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/contacts')
    const data = await res.json()
    setContacts(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { loadContacts() }, [loadContacts])

  async function removeContact(contactId) {
    if (!confirm('Remove this contact?')) return
    const res = await fetch(`/api/admin/contacts/${contactId}`, { method: 'DELETE' })
    if (res.ok) { setSelected(prev => { const n = new Set(prev); n.delete(contactId); return n }); loadContacts() }
    else alert('Failed to remove contact.')
  }

  async function deleteSelected() {
    if (!selected.size) return
    if (!confirm(`Delete ${selected.size} contact${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return
    await Promise.all([...selected].map(id => fetch(`/api/admin/contacts/${id}`, { method: 'DELETE' })))
    setSelected(new Set())
    loadContacts()
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
  }

  const filtered = contacts
    .filter(c => !search || [c.name, c.email, c.car_year, c.car_model].some(v => v?.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      if (sortContacts === 'name_az') return (a.name || '').localeCompare(b.name || '')
      if (sortContacts === 'name_za') return (b.name || '').localeCompare(a.name || '')
      if (sortContacts === 'newest') return new Date(b.contact_created_at || b.created_at) - new Date(a.contact_created_at || a.created_at)
      if (sortContacts === 'oldest') return new Date(a.contact_created_at || a.created_at) - new Date(b.contact_created_at || b.created_at)
      return 0
    })

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.25rem 1.4rem' }}>
          <div style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: '2rem', fontWeight: '300', color: '#1a1a1a', lineHeight: 1 }}>{contacts.length}</div>
          <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.3rem' }}>Total Contacts</div>
        </div>
      </div>

      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.6rem 1rem', background: 'rgba(197,168,130,0.08)', border: '0.5px solid rgba(197,168,130,0.3)' }}>
          <span style={{ fontSize: '11px', color: '#8A6535', letterSpacing: '0.06em' }}>{selected.size} selected</span>
          <button onClick={exportCSV} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3B6B2F', background: 'none', border: '0.5px solid rgba(59,107,47,0.35)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>Export CSV</button>
          <button onClick={deleteSelected} style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7B2032', background: 'none', border: '0.5px solid rgba(123,32,50,0.3)', padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>Delete</button>
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
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: isMobile ? '100%' : undefined }}>
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

      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>No contacts yet.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
        <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff', minWidth: '700px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1.4fr 1.6fr 1.2fr 0.8fr 90px 110px', padding: '0.65rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf9', alignItems: 'center' }}>
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

          {filtered.map((c, idx) => (
            <div key={c.contact_id} style={{ borderBottom: idx < filtered.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
              {/* Summary row */}
              <div
                style={{ display: 'grid', gridTemplateColumns: '28px 1.4fr 1.6fr 1.2fr 0.8fr 90px 110px', padding: '0.85rem 1.25rem', alignItems: 'center', cursor: 'pointer', background: selected.has(c.contact_id) ? 'rgba(123,32,50,0.03)' : undefined }}
                onClick={() => setExpanded(expanded === c.contact_id ? null : c.contact_id)}
              >
                <div onClick={e => e.stopPropagation()}>
                  <input type="checkbox"
                    checked={selected.has(c.contact_id)}
                    onChange={e => setSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(c.contact_id) : n.delete(c.contact_id); return n })}
                    style={{ cursor: 'pointer', accentColor: '#7B2032', width: '13px', height: '13px' }}
                  />
                </div>
                <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{c.name || <span style={{ color: '#ccc' }}>—</span>}</div>
                <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>{c.email}<CopyBtn value={c.email} /></div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  {[c.car_year, c.car_model].filter(Boolean).join(' ') || <span style={{ color: '#ddd' }}>—</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  {c.dob_month ? `${MONTHS_SHORT[c.dob_month - 1]} ${c.dob_day}${c.dob_year ? `, ${c.dob_year}` : ''}` : <span style={{ color: '#ddd' }}>—</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#bbb' }}>
                  {c.created_at ? new Date(c.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : '—'}
                </div>
                <div onClick={e => e.stopPropagation()}>
                  <DangerBtn onClick={() => removeContact(c.contact_id)} small>Remove</DangerBtn>
                </div>
              </div>

              {/* Expanded panel */}
              {expanded === c.contact_id && (
                <div style={{ padding: '1.25rem', background: 'rgba(197,168,130,0.04)', borderTop: '0.5px solid rgba(0,0,0,0.05)', borderLeft: '2px solid #c5a882' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
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
                      <div style={{ fontSize: '13px', color: c.instagram ? '#444' : '#ddd' }}>{c.instagram ? `@${c.instagram}` : '—'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
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

                  {/* Event registrations */}
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
                            <span style={{ fontSize: '12px', color: '#444', minWidth: '260px' }}>{eventName}</span>
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

// ─── Shell ────────────────────────────────────────────────────────────────────

const TABS = ['Members', 'Applications', 'Contacts', 'Announcements', 'Events']
const TAB_ICONS = {
  Members: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
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
}

export default function AdminPage() {
  const [tab, setTab] = useState('Members')
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unseenAppsCount, setUnseenAppsCount] = useState(0)
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([])

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
        const all = [...(Array.isArray(members) ? members : []), ...(Array.isArray(contacts) ? contacts : [])]
          .filter(p => {
            if (!p.dob_month || !p.dob_day || !p.name) return false
            const key = (p.email || p.id || p.name).toLowerCase()
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const in14 = new Date(today); in14.setDate(in14.getDate() + 14)
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
    setTab(t)
    setSidebarOpen(false)
  }

  const sidebarContent = (
    <>
      <div style={{ padding: '1.75rem 1.5rem 1.5rem', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <Link href="/">
          <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={150} height={100} style={{ filter: 'brightness(0) invert(1)', opacity: 0.9, display: 'block' }} />
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
        <div style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}>Upcoming Birthdays</div>
        {upcomingBirthdays.length === 0 ? (
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>None in the next 14 days</div>
        ) : upcomingBirthdays.map(m => {
          const today = new Date(); today.setHours(0, 0, 0, 0)
          const daysUntil = Math.round((m.nextBirthday - today) / 86400000)
          const isToday = daysUntil === 0
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.55rem' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.02em' }}>{m.name.split(' ')[0]}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m.dob_month - 1]} {m.dob_day}</div>
              </div>
              <div style={{ fontSize: '10px', color: isToday ? '#c5a882' : 'rgba(255,255,255,0.4)', letterSpacing: '0.02em', textAlign: 'right' }}>
                {isToday ? 'Today' : `${daysUntil}d`}
              </div>
            </div>
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
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Mobile top bar */}
      {isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '56px', background: '#0F1E14', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', zIndex: 300, borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
          <Link href="/">
            <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={70} height={47} style={{ filter: 'brightness(0) invert(1)', opacity: 0.9, display: 'block' }} />
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
          position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
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

          {tab === 'Members' && <MembersTab isMobile={isMobile} />}
          {tab === 'Applications' && <ApplicationsTab isMobile={isMobile} onUnseenCountChange={setUnseenAppsCount} />}
          {tab === 'Contacts' && <ContactsTab isMobile={isMobile} />}
          {tab === 'Announcements' && <AnnouncementsTab />}
          {tab === 'Events' && <EventsTab />}

        </div>
      </main>
    </div>
  )
}
