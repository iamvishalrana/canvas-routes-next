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

export default function EventsClient() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [form, setForm] = useState({ name: '', date: '', location: '', description: '', type: 'Road Trip', registration_url: '', registration_opens_at: '', registration_closes_at: '', capacity: '', member_price: '', priority_window_end: '' })
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(null) // event id currently uploading
  const [photoError, setPhotoError] = useState(null)
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

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
    setForm({ name: '', date: '', location: '', description: '', type: 'Road Trip', registration_url: '', registration_opens_at: '', registration_closes_at: '', capacity: '', member_price: '', priority_window_end: '' })
    load()
  }

  async function saveEdit() {
    setSaving(true); setSaveError(null)
    const res = await fetch(`/api/admin/events/${editing}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setSaveError(d.error || 'Failed to save.'); return }
    setRegistrantsData(prev => { const next = { ...prev }; delete next[editing]; return next })
    setEditing(null)
    load()
  }

  async function moveEvent(id, direction) {
    const idx = items.findIndex(ev => ev.id === id)
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= items.length) return

    const newItems = [...items]
    const a = { ...newItems[idx] }
    const b = { ...newItems[targetIdx] }
    const aOrder = a.sort_order ?? (idx + 1) * 10
    const bOrder = b.sort_order ?? (targetIdx + 1) * 10
    a.sort_order = bOrder
    b.sort_order = aOrder
    newItems[idx] = b
    newItems[targetIdx] = a
    setItems(newItems)
    await Promise.all([
      fetch(`/api/admin/events/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sort_order: a.sort_order }) }),
      fetch(`/api/admin/events/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sort_order: b.sort_order }) }),
    ])
  }

  async function uploadPhoto(eventId, file) {
    setUploadingPhoto(eventId); setPhotoError(null)
    const fd = new FormData(); fd.append('photo', file)
    const res = await fetch(`/api/admin/events/${eventId}/photo`, { method: 'POST', body: fd })
    const data = await res.json().catch(() => ({}))
    setUploadingPhoto(null)
    if (!res.ok) { setPhotoError(data.error || 'Upload failed.'); return }
    setItems(prev => prev.map(ev => ev.id === eventId ? { ...ev, photo_url: data.url } : ev))
  }

  async function removePhoto(eventId) {
    setUploadingPhoto(eventId)
    await fetch(`/api/admin/events/${eventId}/photo`, { method: 'DELETE' })
    setUploadingPhoto(null)
    setItems(prev => prev.map(ev => ev.id === eventId ? { ...ev, photo_url: null } : ev))
  }

  async function setRegEnabled(id, value) {
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration_enabled: value }),
    })
    if (res.ok) setItems(prev => prev.map(ev => ev.id === id ? { ...ev, registration_enabled: value } : ev))
  }

  async function del(id) {
    setDeleteEventError(null)
    const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
    if (!res.ok) { setDeleteEventError('Failed to delete event.'); return }
    setDeleteEventConfirm(null)
    load()
  }

  async function toggleRegistrants(eventId, eventName) {
    if (showRegistrants === eventId) { setShowRegistrants(null); return }
    setShowRegistrants(eventId)
    if (registrantsData[eventId]) return
    setLoadingRegistrants(true)
    try {
      const [regRes, cRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}/registrants`),
        fetch('/api/admin/contacts'),
      ])
      const regData = regRes.ok ? await regRes.json() : []
      const contacts = cRes.ok ? await cRes.json() : []

      const newRegs = (Array.isArray(regData) ? regData : []).map(r => ({
        name: r.members?.name || r.name || '—',
        email: r.members?.email || r.email || '—',
        phone: '—',
        type: 'Member',
        status: r.stripe_payment_status,
        amount: r.amount_paid,
      }))

      const contactRegs = (Array.isArray(contacts) ? contacts : [])
        .filter(c => (c.registrations || []).some(r => normalizeEventName(r.event) === eventName))
        .map(c => ({ name: c.name, email: c.email, phone: c.phone || '—', type: 'Contact', status: 'legacy' }))

      const seen = new Set()
      const combined = [...newRegs, ...contactRegs].filter(r => {
        const k = (r.email || r.name || '').toLowerCase()
        if (seen.has(k)) return false
        seen.add(k); return true
      })
      setRegistrantsData(prev => ({ ...prev, [eventId]: combined }))
    } catch {
      setRegistrantsData(prev => ({ ...prev, [eventId]: [] }))
    } finally {
      setLoadingRegistrants(false)
    }
  }

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: '0.35rem' }}>Admin</div>
        <h1 style={{ fontSize: '22px', fontWeight: '400', color: '#1a1a1a', margin: 0 }}>Events</h1>
      </div>
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
            <L>External Registration URL (optional — overrides built-in registration)</L>
            <input style={inp} value={form.registration_url} onChange={e => setForm(p => ({ ...p, registration_url: e.target.value }))} placeholder="https://canvasroutes.com/routes" />
          </div>
          <div style={{ marginBottom: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: '0.75rem' }}>Member Registration</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <L>Registration Opens</L>
                <input style={inp} type="datetime-local" value={form.registration_opens_at} onChange={e => setForm(p => ({ ...p, registration_opens_at: e.target.value }))} />
              </div>
              <div>
                <L>Registration Closes (optional)</L>
                <input style={inp} type="datetime-local" value={form.registration_closes_at} onChange={e => setForm(p => ({ ...p, registration_closes_at: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <L>Member Price (CAD) — leave blank for free</L>
                <input style={inp} type="number" min="0" step="0.01" value={form.member_price ? (form.member_price / 100).toFixed(2) : ''} onChange={e => { const cents = Math.round(parseFloat(e.target.value) * 100); setForm(p => ({ ...p, member_price: e.target.value && !isNaN(cents) ? cents : '' })) }} placeholder="0.00" />
              </div>
              <div>
                <L>Capacity (optional)</L>
                <input style={inp} type="number" min="1" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} placeholder="Unlimited" />
              </div>
              <div>
                <L>IC Priority Window Ends</L>
                <input style={inp} type="datetime-local" value={form.priority_window_end} onChange={e => setForm(p => ({ ...p, priority_window_end: e.target.value }))} />
              </div>
            </div>
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
                  <div style={{ marginBottom: '0.6rem' }}><L>Registration URL (external, optional)</L><input style={inp} value={editForm.registration_url || ''} onChange={e => setEditForm(p => ({ ...p, registration_url: e.target.value }))} placeholder="https://canvasroutes.com/routes" /></div>
                  <div style={{ paddingTop: '0.5rem', borderTop: '0.5px solid rgba(0,0,0,0.07)', marginBottom: '0.6rem' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', marginBottom: '0.6rem' }}>Member Registration</div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                      <div><L>Registration Opens</L><input style={inp} type="datetime-local" value={editForm.registration_opens_at ? editForm.registration_opens_at.replace(' ', 'T').slice(0, 16) : ''} onChange={e => setEditForm(p => ({ ...p, registration_opens_at: e.target.value || null }))} /></div>
                      <div><L>Registration Closes (optional)</L><input style={inp} type="datetime-local" value={editForm.registration_closes_at ? editForm.registration_closes_at.replace(' ', 'T').slice(0, 16) : ''} onChange={e => setEditForm(p => ({ ...p, registration_closes_at: e.target.value || null }))} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '0.6rem' }}>
                      <div><L>Member Price (CAD)</L><input style={inp} type="number" min="0" step="0.01" value={editForm.member_price ? (editForm.member_price / 100).toFixed(2) : ''} onChange={e => { const cents = Math.round(parseFloat(e.target.value) * 100); setEditForm(p => ({ ...p, member_price: e.target.value && !isNaN(cents) ? cents : null })) }} placeholder="0.00" /></div>
                      <div><L>Capacity</L><input style={inp} type="number" min="1" value={editForm.capacity || ''} onChange={e => setEditForm(p => ({ ...p, capacity: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Unlimited" /></div>
                      <div><L>IC Priority Window Ends</L><input style={inp} type="datetime-local" value={editForm.priority_window_end ? editForm.priority_window_end.replace(' ', 'T').slice(0, 16) : ''} onChange={e => setEditForm(p => ({ ...p, priority_window_end: e.target.value || null }))} /></div>
                    </div>
                  </div>
                  {/* Event Photo */}
                  <div style={{ paddingTop: '0.5rem', borderTop: '0.5px solid rgba(0,0,0,0.07)', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', marginBottom: '0.6rem' }}>Event Photo (hero image)</div>
                    {item.photo_url && (
                      <div style={{ marginBottom: '0.6rem', position: 'relative', display: 'inline-block' }}>
                        <img src={item.photo_url} alt="" style={{ width: '160px', height: '90px', objectFit: 'cover', display: 'block', border: '0.5px solid rgba(0,0,0,0.1)' }} />
                        <button onClick={() => removePhoto(item.id)} disabled={uploadingPhoto === item.id} style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(123,32,50,0.85)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '11px', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                      </div>
                    )}
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '11px', color: '#555', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif', border: '0.5px solid rgba(0,0,0,0.15)', padding: '0.45rem 0.9rem', background: '#fafaf9' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                      {uploadingPhoto === item.id ? 'Uploading…' : item.photo_url ? 'Replace Photo' : 'Upload Photo'}
                      <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} disabled={uploadingPhoto === item.id} onChange={e => { if (e.target.files[0]) uploadPhoto(item.id, e.target.files[0]) }} />
                    </label>
                    {photoError && <Err msg={photoError} />}
                  </div>
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
                        {item.registration_opens_at && (() => {
                          const now = new Date()
                          const opens = new Date(item.registration_opens_at)
                          const closes = item.registration_closes_at ? new Date(item.registration_closes_at) : null
                          const isOpen = now >= opens && (!closes || now <= closes)
                          const label = isOpen ? 'Registration Open' : now < opens ? `Opens ${opens.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}` : 'Registration Closed'
                          return (
                            <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: isOpen ? '#3B6B2F' : '#888', border: `0.5px solid ${isOpen ? 'rgba(59,107,47,0.3)' : 'rgba(0,0,0,0.15)'}`, padding: '2px 7px', background: isOpen ? 'rgba(59,107,47,0.04)' : 'transparent' }}>
                              {label}{item.member_price ? ` · $${(item.member_price / 100).toFixed(2)}` : ''}{item.capacity ? ` · ${item.capacity} spots` : ''}
                            </span>
                          )
                        })()}
                      </div>
                      <div style={{ fontSize: '11px', color: '#c5a882', fontWeight: '500', marginBottom: '0.25rem' }}>{item.date}</div>
                      {item.location && <div style={{ fontSize: '12px', color: '#888' }}>{item.location}</div>}
                      {item.description && <div style={{ fontSize: '12px', color: '#777', marginTop: '0.3rem', lineHeight: '1.55' }}>{item.description}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: '0.2rem' }}>
                        <button
                          onClick={() => moveEvent(item.id, 'up')}
                          disabled={idx === 0}
                          title="Move up"
                          style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1, padding: '3px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                        </button>
                        <button
                          onClick={() => moveEvent(item.id, 'down')}
                          disabled={idx === items.length - 1}
                          title="Move down"
                          style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', cursor: idx === items.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === items.length - 1 ? 0.3 : 1, padding: '3px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                      </div>
                      <GhostBtn onClick={() => toggleRegistrants(item.id, item.name)} small>{showRegistrants === item.id ? 'Hide' : 'Registrants'}</GhostBtn>
                      <button
                        onClick={() => setRegEnabled(item.id, !item.registration_enabled)}
                        style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', cursor: 'pointer', fontFamily: 'var(--font-inter)', border: `0.5px solid ${item.registration_enabled ? 'rgba(59,107,47,0.35)' : 'rgba(0,0,0,0.15)'}`, color: item.registration_enabled ? '#3B6B2F' : '#888', background: item.registration_enabled ? 'rgba(59,107,47,0.05)' : 'transparent' }}
                      >
                        {item.registration_enabled ? 'Reg On' : 'Reg Off'}
                      </button>
                      <GhostBtn onClick={() => { setEditing(item.id); setEditForm({ name: item.name, date: item.date, location: item.location || '', description: item.description || '', type: item.type, registration_url: item.registration_url || '', registration_opens_at: item.registration_opens_at || '', registration_closes_at: item.registration_closes_at || '', capacity: item.capacity || '', member_price: item.member_price || null, priority_window_end: item.priority_window_end || '', registration_enabled: item.registration_enabled }); setSaveError(null) }} small>Edit</GhostBtn>
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
                  {showRegistrants === item.id && (
                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', marginBottom: '0.6rem' }}>
                        Registrants {registrantsData[item.id] ? `(${registrantsData[item.id].length})` : ''}
                      </div>
                      {loadingRegistrants && !registrantsData[item.id] ? (
                        <div style={{ fontSize: '12px', color: '#ccc' }}>Loading…</div>
                      ) : !registrantsData[item.id] || registrantsData[item.id].length === 0 ? (
                        <div style={{ fontSize: '12px', color: '#ccc' }}>No registrants on record.</div>
                      ) : isMobile ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {registrantsData[item.id].map((r, ri) => (
                              <div key={ri} style={{ padding: '0.6rem 0.75rem', border: '0.5px solid rgba(0,0,0,0.07)', background: '#fafaf9' }}>
                                <div style={{ fontSize: '12px', color: '#333', fontWeight: '500', marginBottom: '0.15rem' }}>{r.name || '—'}</div>
                                <div style={{ fontSize: '11px', color: '#666', marginBottom: '0.1rem' }}>{r.email || '—'}</div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                  <span style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: r.type === 'Member' ? '#3B6B2F' : '#8A6535' }}>{r.type}</span>
                                  {r.status && r.status !== 'legacy' && <span style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: r.status === 'paid' || r.status === 'free' ? '#3B6B2F' : '#8A6535' }}>{r.status}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <div style={{ border: '0.5px solid rgba(0,0,0,0.08)', minWidth: '520px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 90px', padding: '0.5rem 0.85rem', background: '#fafaf9', borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                              {['Name', 'Email', 'Type', 'Status'].map(h => (
                                <div key={h} style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb' }}>{h}</div>
                              ))}
                            </div>
                            {registrantsData[item.id].map((r, ri) => (
                              <div key={ri} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 90px', padding: '0.55rem 0.85rem', borderBottom: ri < registrantsData[item.id].length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none', alignItems: 'center' }}>
                                <div style={{ fontSize: '12px', color: '#333' }}>{r.name || '—'}</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>{r.email || '—'}</div>
                                <div style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: r.type === 'Member' ? '#3B6B2F' : '#8A6535' }}>{r.type}</div>
                                <div style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: (r.status === 'paid' || r.status === 'free') ? '#3B6B2F' : r.status === 'pending' ? '#8A6535' : '#888' }}>{r.status || '—'}</div>
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
