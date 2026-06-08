'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  STATUS_OPTIONS, CAR_YEARS, MONTHS, DOB_YEARS, EMPTY_CAR,
  CANONICAL_EVENTS, MEMBER_ATTENDANCE_KEYS,
  inp, sel,
  L, Badge, SelectWrap, PrimaryBtn, GhostBtn, DangerBtn, Err, Success,
  AdminNotesPanel, Pagination,
} from '../_components/shared'
import { ExportButton } from '../_components/ExportModal'

// ─── Member Expanded Panel ────────────────────────────────────────────────────

function MemberExpandedPanel({ m, onToggleAttendance, isMobile, editingNote, noteValue, setEditingNote, setNoteValue, onSaveNote }) {

  const initials = (m.name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const memberSinceRaw = m.created_at || m.password_set_at
  const memberSinceStr = memberSinceRaw ? new Date(memberSinceRaw).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null
  const cars = m.cars?.length > 0 ? m.cars : (m.car_year || m.car_make || m.car_model ? [{ year: m.car_year, make: m.car_make, model: m.car_model, license_plate: '' }] : [])
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

// ─── Members Client ───────────────────────────────────────────────────────────

export default function MembersClient({ initialMembers, total, page, pageSize }) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile client-side
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Sync when server re-renders with fresh paginated data after router.refresh()
  useEffect(() => { setMembers(initialMembers) }, [initialMembers])
  const [loading, setLoading] = useState(false)
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
    router.refresh()
  }

  async function deleteMember(m) {
    setDeleteMemberError(null)
    const res = await fetch(`/api/admin/members/${m.id}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json(); setDeleteMemberError(d.error || 'Failed to delete.'); return }
    setDeleteMemberConfirm(null)
    router.refresh()
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
    router.refresh()
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
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '0.35rem' }}>Admin</div>
        <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', margin: 0 }}>Members</h1>
      </div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total', value: total, color: '#1a1a1a' },
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
          {filtered.length > 0 && selected.size === 0 && (
            <ExportButton
              filename="members"
              title="Members"
              headers={['Name', 'Email', 'Phone', 'Status', 'Tier', 'Car Year', 'Car Make', 'Car Model', 'DOB', 'Instagram', 'Joined']}
              rows={filtered.map(m => [
                m.name || '',
                m.email || '',
                m.phone || '',
                m.membership_status || '',
                m.tier || '',
                m.car_year || (m.cars?.[0]?.year) || '',
                m.car_make || (m.cars?.[0]?.make) || '',
                m.car_model || (m.cars?.[0]?.model) || '',
                m.dob_month ? `${m.dob_month}/${m.dob_day}${m.dob_year ? `/${m.dob_year}` : ''}` : '',
                m.instagram || '',
                m.created_at ? new Date(m.created_at).toLocaleDateString('en-CA') : '',
              ])}
            />
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

          <Pagination
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={n => router.push(`?page=${n}`)}
          />
        </div>
      )}
    </div>
  )
}
