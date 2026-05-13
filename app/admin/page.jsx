'use client'
import { useState, useEffect, useCallback } from 'react'

const STATUS_OPTIONS = ['pending', 'active', 'suspended', 'expired']
const STATUS_COLORS = {
  active:    { bg: 'rgba(59,107,47,0.1)',  text: '#3B6B2F', border: 'rgba(59,107,47,0.3)'  },
  pending:   { bg: 'rgba(123,91,46,0.1)',  text: '#7B5B2E', border: 'rgba(123,91,46,0.3)'  },
  suspended: { bg: 'rgba(123,32,50,0.1)',  text: '#7B2032', border: 'rgba(123,32,50,0.3)'  },
  expired:   { bg: 'rgba(0,0,0,0.05)',     text: '#888',    border: 'rgba(0,0,0,0.15)'      },
}
const EVENT_TYPES = ['Road Trip', 'Cars & Coffee', 'Social', 'Track Day', 'Other']

const inputStyle = { width: '100%', padding: '0.7rem 0.9rem', border: '1px solid rgba(0,0,0,0.15)', background: 'transparent', fontSize: '13px', fontFamily: 'var(--font-inter),sans-serif', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }
const selectStyle = { ...inputStyle, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' }
const btnStyle = { padding: '0.65rem 1.4rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }
const btnGhostStyle = { ...btnStyle, background: 'transparent', color: '#0F1E14', border: '0.5px solid rgba(0,0,0,0.25)' }
const btnDangerStyle = { ...btnStyle, background: 'transparent', color: '#7B2032', border: '0.5px solid rgba(123,32,50,0.4)' }

function Label({ children }) {
  return <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', marginBottom: '0.4rem' }}>{children}</div>
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending
  return (
    <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', border: `0.5px solid ${s.border}`, background: s.bg, color: s.text, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  )
}

// ─── Members Tab ────────────────────────────────────────────────────────────

function MembersTab() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', membership_status: 'pending' })
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/members')
    const data = await res.json()
    setMembers(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function startEdit(m) {
    setEditing(m.id)
    setEditForm({ membership_status: m.membership_status, name: m.name || '', phone: m.phone || '', car_year: m.car_year || '', car_make: m.car_make || '', car_model: m.car_model || '' })
  }

  async function saveEdit() {
    setSaving(true)
    await fetch(`/api/admin/members/${editing}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) })
    setSaving(false)
    setEditing(null)
    load()
  }

  async function invite(e) {
    e.preventDefault()
    if (!inviteForm.email.trim()) { setInviteError('Email required.'); return }
    setInviting(true); setInviteError(null); setInviteSuccess(false)
    const res = await fetch('/api/admin/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inviteForm) })
    const data = await res.json()
    setInviting(false)
    if (!res.ok) { setInviteError(data.error || 'Failed.'); return }
    setInviteSuccess(true)
    setInviteForm({ name: '', email: '', membership_status: 'pending' })
    load()
  }

  const filtered = members.filter(m =>
    !search || [m.name, m.email, m.membership_status].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      {/* Invite */}
      <div style={{ marginBottom: '3rem', padding: '1.5rem', border: '0.5px solid rgba(0,0,0,0.12)', background: '#fafaf9' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1.2rem' }}>Invite New Member</div>
        <form onSubmit={invite} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px auto', gap: '0.75rem', alignItems: 'end' }}>
          <div>
            <Label>Full Name</Label>
            <input style={inputStyle} value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} placeholder="Name" />
          </div>
          <div>
            <Label>Email *</Label>
            <input style={inputStyle} type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
          </div>
          <div>
            <Label>Status</Label>
            <div style={{ position: 'relative' }}>
              <select style={selectStyle} value={inviteForm.membership_status} onChange={e => setInviteForm(p => ({ ...p, membership_status: e.target.value }))}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <button type="submit" disabled={inviting} style={{ ...btnStyle, opacity: inviting ? 0.6 : 1 }}>{inviting ? 'Sending…' : 'Send Invite'}</button>
        </form>
        {inviteError && <div style={{ fontSize: '12px', color: '#7B2032', marginTop: '0.5rem' }}>{inviteError}</div>}
        {inviteSuccess && <div style={{ fontSize: '12px', color: '#3B6B2F', marginTop: '0.5rem' }}>Invite sent.</div>}
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888' }}>{filtered.length} member{filtered.length !== 1 ? 's' : ''}</div>
        <input style={{ ...inputStyle, width: '240px' }} placeholder="Search name, email, status…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ fontSize: '13px', color: '#aaa', padding: '2rem 0' }}>Loading…</div>
      ) : (
        <div style={{ border: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 120px 1fr 80px', borderBottom: '0.5px solid rgba(0,0,0,0.12)', padding: '0.6rem 1rem', background: '#fafaf9' }}>
            {['Name', 'Email', 'Status', 'Car', ''].map(h => (
              <div key={h} style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888' }}>{h}</div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: '2rem 1rem', fontSize: '13px', color: '#aaa' }}>No members found.</div>
          )}
          {filtered.map(m => (
            <div key={m.id}>
              {editing === m.id ? (
                <div style={{ padding: '1.2rem 1rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: 'rgba(197,168,130,0.04)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    {[['Name', 'name', 'text'], ['Phone', 'phone', 'tel'], ['Car Year', 'car_year', 'text'], ['Make', 'car_make', 'text'], ['Model', 'car_model', 'text']].map(([label, key, type]) => (
                      <div key={key}>
                        <Label>{label}</Label>
                        <input style={inputStyle} type={type} value={editForm[key]} onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ position: 'relative', width: '160px' }}>
                      <Label>Status</Label>
                      <select style={selectStyle} value={editForm.membership_status} onChange={e => setEditForm(p => ({ ...p, membership_status: e.target.value }))}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <svg style={{ position: 'absolute', right: '8px', top: 'calc(50% + 10px)', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.4rem' }}>
                      <button onClick={saveEdit} disabled={saving} style={{ ...btnStyle, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
                      <button onClick={() => setEditing(null)} style={btnGhostStyle}>Cancel</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 120px 1fr 80px', padding: '0.9rem 1rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{m.name || <span style={{ color: '#ccc' }}>—</span>}</div>
                  <div style={{ fontSize: '12px', color: '#555' }}>{m.email}</div>
                  <div><StatusBadge status={m.membership_status} /></div>
                  <div style={{ fontSize: '12px', color: '#777' }}>{[m.car_year, m.car_make, m.car_model].filter(Boolean).join(' ') || <span style={{ color: '#ccc' }}>—</span>}</div>
                  <button onClick={() => startEdit(m)} style={{ ...btnGhostStyle, padding: '0.4rem 0.8rem', fontSize: '10px' }}>Edit</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Announcements Tab ───────────────────────────────────────────────────────

function AnnouncementsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', content: '', published: false })
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

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
    const res = await fetch('/api/admin/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    setPosting(false)
    if (!res.ok) { setPostError(data.error || 'Failed.'); return }
    setForm({ title: '', content: '', published: false })
    load()
  }

  async function togglePublish(item) {
    await fetch(`/api/admin/announcements/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: !item.published }) })
    load()
  }

  async function saveEdit() {
    setSaving(true)
    await fetch(`/api/admin/announcements/${editing}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) })
    setSaving(false)
    setEditing(null)
    load()
  }

  async function del(id) {
    if (!confirm('Delete this announcement?')) return
    await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      {/* New */}
      <div style={{ marginBottom: '3rem', padding: '1.5rem', border: '0.5px solid rgba(0,0,0,0.12)', background: '#fafaf9' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1.2rem' }}>New Announcement</div>
        <form onSubmit={post}>
          <div style={{ marginBottom: '0.75rem' }}>
            <Label>Title</Label>
            <input style={inputStyle} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Announcement title" maxLength={200} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <Label>Content</Label>
            <textarea style={{ ...inputStyle, height: '100px', resize: 'vertical' }} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Write your announcement here…" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '12px', color: '#555' }}>
              <input type="checkbox" checked={form.published} onChange={e => setForm(p => ({ ...p, published: e.target.checked }))} />
              Publish immediately
            </label>
            <button type="submit" disabled={posting} style={{ ...btnStyle, opacity: posting ? 0.6 : 1 }}>{posting ? 'Posting…' : 'Post'}</button>
          </div>
          {postError && <div style={{ fontSize: '12px', color: '#7B2032', marginTop: '0.5rem' }}>{postError}</div>}
        </form>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ fontSize: '13px', color: '#aaa' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#aaa' }}>No announcements yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {items.map(item => (
            <div key={item.id} style={{ padding: '1.2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
              {editing === item.id ? (
                <div>
                  <div style={{ marginBottom: '0.6rem' }}>
                    <Label>Title</Label>
                    <input style={inputStyle} value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <Label>Content</Label>
                    <textarea style={{ ...inputStyle, height: '90px', resize: 'vertical' }} value={editForm.content} onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={saveEdit} disabled={saving} style={{ ...btnStyle, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => setEditing(null)} style={btnGhostStyle}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1a1a1a' }}>{item.title}</div>
                      <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '1px 7px', border: item.published ? '0.5px solid rgba(59,107,47,0.3)' : '0.5px solid rgba(0,0,0,0.15)', background: item.published ? 'rgba(59,107,47,0.08)' : 'rgba(0,0,0,0.03)', color: item.published ? '#3B6B2F' : '#aaa' }}>
                        {item.published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{item.content}</div>
                    <div style={{ fontSize: '10px', color: '#bbb', marginTop: '0.4rem' }}>{new Date(item.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <button onClick={() => togglePublish(item)} style={{ ...btnGhostStyle, padding: '0.35rem 0.8rem', fontSize: '10px' }}>{item.published ? 'Unpublish' : 'Publish'}</button>
                    <button onClick={() => { setEditing(item.id); setEditForm({ title: item.title, content: item.content }) }} style={{ ...btnGhostStyle, padding: '0.35rem 0.8rem', fontSize: '10px' }}>Edit</button>
                    <button onClick={() => del(item.id)} style={{ ...btnDangerStyle, padding: '0.35rem 0.8rem', fontSize: '10px' }}>Delete</button>
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

// ─── Events Tab ──────────────────────────────────────────────────────────────

function EventsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', date: '', location: '', description: '', type: 'Road Trip' })
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

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
    if (!form.name.trim() || !form.date.trim() || !form.type.trim()) { setPostError('Name, date and type required.'); return }
    setPosting(true); setPostError(null)
    const res = await fetch('/api/admin/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    setPosting(false)
    if (!res.ok) { setPostError(data.error || 'Failed.'); return }
    setForm({ name: '', date: '', location: '', description: '', type: 'Road Trip' })
    load()
  }

  async function saveEdit() {
    setSaving(true)
    await fetch(`/api/admin/events/${editing}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) })
    setSaving(false)
    setEditing(null)
    load()
  }

  async function del(id) {
    if (!confirm('Delete this event?')) return
    await fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      {/* New */}
      <div style={{ marginBottom: '3rem', padding: '1.5rem', border: '0.5px solid rgba(0,0,0,0.12)', background: '#fafaf9' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', marginBottom: '1.2rem' }}>New Event</div>
        <form onSubmit={post}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 120px', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <Label>Event Name *</Label>
              <input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Into the Laurentians" maxLength={200} />
            </div>
            <div>
              <Label>Date *</Label>
              <input style={inputStyle} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} placeholder="May 31, 2026" />
            </div>
            <div>
              <Label>Type *</Label>
              <div style={{ position: 'relative' }}>
                <select style={selectStyle} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <Label>Location</Label>
            <input style={inputStyle} value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Montreal → Mont-Tremblant" />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <Label>Description</Label>
            <textarea style={{ ...inputStyle, height: '80px', resize: 'vertical' }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description shown to members…" />
          </div>
          <button type="submit" disabled={posting} style={{ ...btnStyle, opacity: posting ? 0.6 : 1 }}>{posting ? 'Adding…' : 'Add Event'}</button>
          {postError && <div style={{ fontSize: '12px', color: '#7B2032', marginTop: '0.5rem' }}>{postError}</div>}
        </form>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ fontSize: '13px', color: '#aaa' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#aaa' }}>No events yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {items.map(item => (
            <div key={item.id} style={{ padding: '1.2rem 0', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
              {editing === item.id ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 120px', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <Label>Name</Label>
                      <input style={inputStyle} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Date</Label>
                      <input style={inputStyle} value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <div style={{ position: 'relative' }}>
                        <select style={selectStyle} value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))}>
                          {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <svg style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginBottom: '0.6rem' }}>
                    <Label>Location</Label>
                    <input style={inputStyle} value={editForm.location || ''} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <Label>Description</Label>
                    <textarea style={{ ...inputStyle, height: '80px', resize: 'vertical' }} value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={saveEdit} disabled={saving} style={{ ...btnStyle, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => setEditing(null)} style={btnGhostStyle}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1a1a1a' }}>{item.name}</div>
                      <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7B5B2E', border: '0.5px solid rgba(123,91,46,0.3)', padding: '1px 6px' }}>{item.type}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#c5a882', marginBottom: '0.2rem' }}>{item.date}</div>
                    {item.location && <div style={{ fontSize: '12px', color: '#888' }}>{item.location}</div>}
                    {item.description && <div style={{ fontSize: '12px', color: '#777', marginTop: '0.3rem', lineHeight: '1.5' }}>{item.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <button onClick={() => { setEditing(item.id); setEditForm({ name: item.name, date: item.date, location: item.location || '', description: item.description || '', type: item.type }) }} style={{ ...btnGhostStyle, padding: '0.35rem 0.8rem', fontSize: '10px' }}>Edit</button>
                    <button onClick={() => del(item.id)} style={{ ...btnDangerStyle, padding: '0.35rem 0.8rem', fontSize: '10px' }}>Delete</button>
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

// ─── Main Admin Page ─────────────────────────────────────────────────────────

const TABS = ['Members', 'Announcements', 'Events']

export default function AdminPage() {
  const [tab, setTab] = useState('Members')

  return (
    <div style={{ minHeight: '100vh', background: '#F5F1EC', fontFamily: 'var(--font-inter),sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 2rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888', marginBottom: '0.5rem' }}>Canvas Routes</div>
          <div style={{ fontFamily: 'var(--font-cormorant),serif', fontSize: '2.4rem', fontWeight: '300', color: '#1a1a1a' }}>Admin Panel</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '2.5rem', borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ background: 'none', border: 'none', borderBottom: tab === t ? '1.5px solid #0F1E14' : '1.5px solid transparent', padding: '0.6rem 1.4rem', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tab === t ? '#1a1a1a' : '#888', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', marginBottom: '-0.5px' }}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'Members' && <MembersTab />}
        {tab === 'Announcements' && <AnnouncementsTab />}
        {tab === 'Events' && <EventsTab />}

      </div>
    </div>
  )
}
