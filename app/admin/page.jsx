'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const STATUS_OPTIONS = ['pending', 'active', 'suspended', 'expired']
const STATUS_COLORS = {
  active:    { bg: 'rgba(59,107,47,0.1)',   text: '#3B6B2F', border: 'rgba(59,107,47,0.3)'   },
  pending:   { bg: 'rgba(197,168,130,0.15)', text: '#8A6535', border: 'rgba(197,168,130,0.45)' },
  suspended: { bg: 'rgba(123,32,50,0.1)',   text: '#7B2032', border: 'rgba(123,32,50,0.3)'   },
  expired:   { bg: 'rgba(0,0,0,0.05)',      text: '#999',    border: 'rgba(0,0,0,0.15)'      },
}
const EVENT_TYPES = ['Road Trip', 'Cars & Coffee', 'Social', 'Track Day', 'Other']

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

function GhostBtn({ onClick, small, children }) {
  return (
    <button type="button" onClick={onClick}
      style={{ padding: small ? '0.35rem 0.8rem' : '0.65rem 1.2rem', background: 'transparent', color: '#555', border: '0.5px solid rgba(0,0,0,0.2)', fontSize: small ? '10px' : '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
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

// ─── Members Tab ─────────────────────────────────────────────────────────────

function MembersTab() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', membership_status: 'pending' })
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/members')
    if (res.status === 403) { setForbidden(true); setLoading(false); return }
    const data = await res.json()
    setMembers(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function startEdit(m) {
    setEditing(m.id)
    setSaveError(null)
    setEditForm({ membership_status: m.membership_status, name: m.name || '', phone: m.phone || '', car_year: m.car_year || '', car_make: m.car_make || '', car_model: m.car_model || '' })
  }

  async function saveEdit() {
    setSaving(true); setSaveError(null)
    const res = await fetch(`/api/admin/members/${editing}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm),
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

  async function invite(e) {
    e.preventDefault()
    if (!inviteForm.email.trim()) { setInviteError('Email required.'); return }
    setInviting(true); setInviteError(null); setInviteSuccess(false)
    const res = await fetch('/api/admin/members', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inviteForm),
    })
    const data = await res.json()
    setInviting(false)
    if (!res.ok) { setInviteError(data.error || 'Failed to send invite.'); return }
    setInviteSuccess(true)
    setInviteForm({ name: '', email: '', membership_status: 'pending' })
    load()
    setTimeout(() => setInviteSuccess(false), 4000)
  }

  const filtered = members.filter(m =>
    !search || [m.name, m.email, m.membership_status].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total', value: members.length, color: '#1a1a1a' },
          { label: 'Active', value: counts.active, color: '#3B6B2F' },
          { label: 'Pending', value: counts.pending, color: '#8A6535' },
          { label: 'Suspended', value: counts.suspended, color: '#7B2032' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', padding: '1.25rem 1.4rem' }}>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.2rem', fontWeight: '300', color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.3rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Invite */}
      <div style={{ marginBottom: '2rem', padding: '1.75rem', border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1.25rem' }}>Invite New Member</div>
        <form onSubmit={invite} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 180px auto', gap: '0.75rem', alignItems: 'end' }}>
          <div>
            <L>Full Name</L>
            <input style={inp} value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} placeholder="Name" />
          </div>
          <div>
            <L>Email *</L>
            <input style={inp} type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
          </div>
          <div>
            <L>Initial Status</L>
            <SelectWrap value={inviteForm.membership_status} onChange={e => setInviteForm(p => ({ ...p, membership_status: e.target.value }))} options={STATUS_OPTIONS} />
          </div>
          <PrimaryBtn type="submit" disabled={inviting}>{inviting ? 'Sending…' : 'Send Invite'}</PrimaryBtn>
        </form>
        <Err msg={inviteError} />
        <Success msg={inviteSuccess ? 'Invite sent successfully.' : null} />
      </div>

      {/* Member List */}
      {actionError && <Err msg={actionError} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999' }}>
          {filtered.length} of {members.length} member{members.length !== 1 ? 's' : ''}
        </div>
        <input style={{ ...inp, width: '220px' }} placeholder="Search name, email, status…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ padding: '4rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : (
        <div style={{ border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 130px 1fr 100px', padding: '0.65rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf9' }}>
            {['Name', 'Email', 'Status', 'Car', ''].map((h, i) => (
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                    {[['Name', 'name', 'text'], ['Phone', 'phone', 'tel'], ['Car Year', 'car_year', 'text'], ['Make', 'car_make', 'text'], ['Model', 'car_model', 'text']].map(([label, key, type]) => (
                      <div key={key}>
                        <L>{label}</L>
                        <input style={inp} type={type} value={editForm[key]} onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ width: '180px' }}>
                      <L>Status</L>
                      <SelectWrap value={editForm.membership_status} onChange={e => setEditForm(p => ({ ...p, membership_status: e.target.value }))} options={STATUS_OPTIONS} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <PrimaryBtn onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</PrimaryBtn>
                      <GhostBtn onClick={() => setEditing(null)}>Cancel</GhostBtn>
                    </div>
                  </div>
                  <Err msg={saveError} />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 130px 1fr 100px', padding: '0.9rem 1.25rem', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{m.name || <span style={{ color: '#ccc' }}>No name</span>}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{m.email}</div>
                  <div><Badge status={m.membership_status} /></div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{[m.car_year, m.car_make, m.car_model].filter(Boolean).join(' ') || <span style={{ color: '#ddd' }}>—</span>}</div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <GhostBtn onClick={() => startEdit(m)} small>Edit</GhostBtn>
                    <DangerBtn onClick={() => deleteMember(m)} small>Delete</DangerBtn>
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

// ─── Shell ────────────────────────────────────────────────────────────────────

const TABS = ['Members', 'Announcements', 'Events']
const TAB_ICONS = {
  Members: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-inter),sans-serif' }}>

      {/* Sidebar */}
      <aside style={{ width: '220px', flexShrink: 0, background: '#0F1E14', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '1.75rem 1.5rem 1.5rem', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
          <Link href="/">
            <Image src="/canvas_routes_refined.png" alt="Canvas Routes" width={110} height={73} style={{ filter: 'brightness(0) invert(1)', opacity: 0.9, display: 'block' }} />
          </Link>
          <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: '0.75rem' }}>Admin Panel</div>
        </div>

        <nav style={{ padding: '1.25rem 0', flex: 1 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
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
              {t}
            </button>
          ))}
        </nav>

        <div style={{ padding: '1.25rem 1.5rem', borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <Link href="/members/dashboard" style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
            → Portal
          </Link>
          <Link href="/members/profile" style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
            → Profile
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, background: '#F5F1EC', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1000px', padding: '3rem 2.5rem' }}>

          {/* Header */}
          <div style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
            <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2rem', fontWeight: '300', color: '#1a1a1a' }}>{tab}</div>
          </div>

          {tab === 'Members' && <MembersTab />}
          {tab === 'Announcements' && <AnnouncementsTab />}
          {tab === 'Events' && <EventsTab />}

        </div>
      </main>
    </div>
  )
}
