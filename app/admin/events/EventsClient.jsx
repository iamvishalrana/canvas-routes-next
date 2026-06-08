'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  EVENT_TYPES,
  MEMBER_ATTENDANCE_KEYS,
  normalizeEventName,
  inp,
  L,
  SelectWrap,
  PrimaryBtn,
  GhostBtn,
  DangerBtn,
  Err,
} from '../_components/shared'

export default function EventsClient({ isMobile }) {
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
    try {
      const res = await fetch('/api/admin/events')
      const data = await res.json().catch(() => [])
      setItems(Array.isArray(data) ? data : [])
    } catch { setItems([]) } finally { setLoading(false) }
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
