'use client'
import { useState, useEffect, useCallback } from 'react'
import { inp, sel, L, PrimaryBtn, GhostBtn, DangerBtn, Err } from '../_components/shared'

export default function AnnouncementsClient() {
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
    try {
      const res = await fetch('/api/admin/announcements')
      const data = await res.json().catch(() => [])
      setItems(Array.isArray(data) ? data : [])
    } catch { setItems([]) } finally { setLoading(false) }
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
