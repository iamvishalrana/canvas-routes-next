'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { inp, L, PrimaryBtn, GhostBtn, DangerBtn, Err } from '../_components/shared'
import { createClient } from '../../../lib/supabase/client'

const BUCKET = 'gallery-photos'
const ALLOWED = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

// Each photo is stored twice: the untouched original (members download this)
// and this downscaled display copy used in grids and the lightbox so browsing
// stays fast and cheap on egress. Falls back to the original on any failure.
async function compressImage(file) {
  try {
    let bitmap
    try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }) }
    catch { bitmap = await createImageBitmap(file) }
    const MAX = 2000
    const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < 2.5 * 1024 * 1024) { bitmap.close?.(); return file }
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.85))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch { return file }
}

function formatDate(d) {
  if (!d) return null
  return new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function CaptionInput({ photo, onSaved }) {
  const [value, setValue] = useState(photo.caption || '')
  async function save() {
    if (value.trim() === (photo.caption || '')) return
    try {
      const res = await fetch(`/api/admin/gallery/${photo.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: value }),
      })
      if (res.ok) onSaved(await res.json())
    } catch {}
  }
  return (
    <input
      style={{ ...inp, padding: '0.35rem 0.5rem', fontSize: '11px', borderRadius: '6px', border: '0.5px solid rgba(0,0,0,0.1)' }}
      placeholder="Caption…" value={value} maxLength={300}
      onChange={e => setValue(e.target.value)} onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
    />
  )
}

// Multi-select popover for tagging which members appear in an event photo.
// Tags don't gate who can view the photo (attendance does that) — they let
// members filter "photos of X" within an album they already have access to.
function TagPicker({ photo, members, onSaved }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e) { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  async function toggle(member) {
    const has = (photo.tags || []).some(t => t.id === member.id)
    const nextTags = has ? photo.tags.filter(t => t.id !== member.id) : [...(photo.tags || []), member]
    onSaved({ ...photo, tags: nextTags }) // optimistic
    try {
      const res = await fetch(`/api/admin/gallery/${photo.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: nextTags.map(t => t.id) }),
      })
      if (!res.ok) onSaved(photo) // revert on failure
    } catch { onSaved(photo) }
  }

  const q = search.trim().toLowerCase()
  const filtered = members.filter(m => !q || m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)).slice(0, 30)

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
        {(photo.tags || []).map(t => (
          <span key={t.id} style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '99px', background: 'rgba(197,168,130,0.15)', color: '#8A6535', whiteSpace: 'nowrap' }}>{t.name || t.email || '—'}</span>
        ))}
        <button type="button" onClick={() => setOpen(v => !v)}
          style={{ fontSize: '9px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#c5a882', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
          + Tag
        </button>
      </div>
      {open && (
        <div style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, marginTop: '4px', width: '200px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', padding: '0.5rem' }}>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…"
            style={{ ...inp, fontSize: '11px', padding: '0.4rem 0.6rem', marginBottom: '0.4rem' }} />
          <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
            {filtered.length === 0 && <div style={{ fontSize: '11px', color: '#bbb', padding: '0.4rem' }}>No matches</div>}
            {filtered.map(m => {
              const checked = (photo.tags || []).some(t => t.id === m.id)
              return (
                <button key={m.id} type="button" onClick={() => toggle(m)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', textAlign: 'left', padding: '0.35rem 0.4rem', background: checked ? 'rgba(69,100,60,0.08)' : 'none', border: 'none', cursor: 'pointer', borderRadius: '6px', fontFamily: 'var(--font-inter),sans-serif' }}>
                  <span style={{ width: '13px', height: '13px', borderRadius: '3px', border: `1px solid ${checked ? '#45643C' : 'rgba(0,0,0,0.25)'}`, background: checked ? '#45643C' : 'none', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name || m.email}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Search-to-select a single member — used to pick whose Car & Personal folder
// to upload into.
function MemberSearchSelect({ members, onSelect, placeholder }) {
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const filtered = q ? members.filter(m => m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)).slice(0, 12) : []
  return (
    <div style={{ position: 'relative' }}>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={placeholder}
        style={{ ...inp }} />
      {filtered.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, marginTop: '4px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: '8px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', maxHeight: '220px', overflowY: 'auto' }}>
          {filtered.map(m => (
            <button key={m.id} type="button" onClick={() => { onSelect(m); setSearch('') }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', background: 'none', border: 'none', borderBottom: '0.5px solid rgba(0,0,0,0.05)', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
              <div style={{ fontSize: '12px', color: '#1a1a1a' }}>{m.name || '(no name)'}</div>
              <div style={{ fontSize: '10px', color: '#999' }}>{m.email}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PhotoTile({ photo, members, showTags, armedPhoto, armDelete, handleDeletePhoto, onSaved }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', background: 'rgba(0,0,0,0.04)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.photo_url} alt={photo.caption || photo.album || ''} loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <button type="button"
          onClick={() => armedPhoto === photo.id ? handleDeletePhoto(photo) : armDelete(photo.id)}
          aria-label={armedPhoto === photo.id ? 'Confirm delete' : 'Delete photo'}
          style={{
            position: 'absolute', top: '6px', right: '6px', width: armedPhoto === photo.id ? 'auto' : '26px', height: '26px',
            padding: armedPhoto === photo.id ? '0 10px' : 0,
            borderRadius: '99px', border: 'none', cursor: 'pointer',
            background: armedPhoto === photo.id ? '#93333E' : 'rgba(15,30,20,0.65)',
            color: '#fff', fontSize: armedPhoto === photo.id ? '10px' : '14px',
            letterSpacing: armedPhoto === photo.id ? '0.08em' : 0,
            fontFamily: 'var(--font-inter),sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}>
          {armedPhoto === photo.id ? 'Delete?' : '×'}
        </button>
      </div>
      <CaptionInput photo={photo} onSaved={onSaved} />
      {showTags && <TagPicker photo={photo} members={members} onSaved={onSaved} />}
    </div>
  )
}

export default function PhotosClient() {
  const [mode, setMode] = useState('event') // 'event' | 'personal'
  const [photos, setPhotos] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [listErr, setListErr] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', date: '' })
  const [formErr, setFormErr] = useState('')
  const [upload, setUpload] = useState(null) // { label, done, total, errors: [] }
  const [editing, setEditing] = useState(null) // { orig, name, date }
  const [deleteAlbum, setDeleteAlbum] = useState(null)
  const [armedPhoto, setArmedPhoto] = useState(null)
  const [personalMember, setPersonalMember] = useState(null)
  const newFilesRef = useRef(null)
  const addFilesRef = useRef(null)
  const addTargetRef = useRef(null)
  const personalFilesRef = useRef(null)
  const armTimerRef = useRef(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/gallery').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      fetch('/api/admin/members').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
    ])
      .then(([photoData, memberData]) => {
        setPhotos(Array.isArray(photoData) ? photoData : [])
        setMembers(Array.isArray(memberData) ? memberData.map(m => ({ id: m.id, name: m.name, email: m.email })) : [])
        setLoading(false)
      })
      .catch(() => { setListErr('Failed to load photos.'); setLoading(false) })
  }, [])

  useEffect(() => () => clearTimeout(armTimerRef.current), [])

  const albums = useMemo(() => {
    const map = new Map()
    for (const p of photos) {
      if (p.category !== 'event') continue
      if (!map.has(p.album)) map.set(p.album, { name: p.album, date: p.album_date, photos: [] })
      const a = map.get(p.album)
      a.photos.push(p)
      if (p.album_date && !a.date) a.date = p.album_date
    }
    return [...map.values()].sort((x, y) => (y.date || '0000').localeCompare(x.date || '0000'))
  }, [photos])

  const personalGroups = useMemo(() => {
    const map = new Map()
    for (const p of photos) {
      if (p.category !== 'personal') continue
      const key = p.member_id
      if (!map.has(key)) map.set(key, { member: p.member, photos: [] })
      map.get(key).photos.push(p)
    }
    return [...map.values()].sort((a, b) => (a.member?.name || '').localeCompare(b.member?.name || ''))
  }, [photos])

  // Uploads go browser → Supabase Storage directly via signed URLs (full-size
  // originals exceed the serverless request-body limit), then the row is
  // recorded through the API once both files are confirmed in the bucket.
  async function uploadFiles({ category, album, albumDate, memberId, label }, fileList) {
    const all = Array.from(fileList || [])
    const files = all.filter(f => ALLOWED[f.type])
    const skipped = all.filter(f => !ALLOWED[f.type]).map(f => `${f.name} — unsupported format (use JPEG, PNG, or WebP; iOS converts HEIC automatically when picking from Photos)`)
    if (!all.length) return
    setUpload({ label, done: 0, total: files.length, errors: skipped })
    const supabase = createClient()
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        if (file.size > 50 * 1024 * 1024) throw new Error('over the 50 MB per-file limit')
        const display = await compressImage(file)
        const urlRes = await fetch('/api/admin/gallery/upload-url', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origExt: ALLOWED[file.type], dispExt: ALLOWED[display.type] || 'jpg' }),
        })
        const urls = await urlRes.json().catch(() => ({}))
        if (!urlRes.ok) throw new Error(urls.error || `HTTP ${urlRes.status}`)
        const [orig, disp] = await Promise.all([
          supabase.storage.from(BUCKET).uploadToSignedUrl(urls.originalPath, urls.originalToken, file, { contentType: file.type }),
          supabase.storage.from(BUCKET).uploadToSignedUrl(urls.displayPath, urls.displayToken, display, { contentType: display.type }),
        ])
        if (orig.error || disp.error) throw new Error((orig.error || disp.error).message || 'upload failed')
        const res = await fetch('/api/admin/gallery', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, album, albumDate: albumDate || '', memberId, displayPath: urls.displayPath, originalPath: urls.originalPath }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
        setPhotos(prev => [...prev, data])
      } catch (err) {
        setUpload(u => u ? { ...u, errors: [...u.errors, `${file.name} — ${err.message}`] } : u)
      }
      setUpload(u => u ? { ...u, done: i + 1 } : u)
    }
    setUpload(u => u && u.errors.length ? u : null)
  }

  async function handleNewAlbum(e) {
    e.preventDefault()
    const files = newFilesRef.current?.files
    if (!form.name.trim()) { setFormErr('Event name is required.'); return }
    if (!files?.length) { setFormErr('Select at least one photo.'); return }
    setFormErr('')
    const name = form.name.trim()
    const date = form.date
    setAdding(false)
    setForm({ name: '', date: '' })
    await uploadFiles({ category: 'event', album: name, albumDate: date, label: name }, files)
  }

  async function saveAlbumEdit() {
    if (!editing) return
    const { orig, name, date } = editing
    try {
      const res = await fetch('/api/admin/gallery', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album: orig, newAlbum: name.trim() || orig, newDate: date || null }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setListErr(d.error || 'Failed to update album.'); return }
      setPhotos(prev => prev.map(p => p.album === orig ? { ...p, album: name.trim() || orig, album_date: date || null } : p))
      setEditing(null)
    } catch { setListErr('Network error — album not updated.') }
  }

  async function handleDeleteAlbum(name) {
    try {
      const res = await fetch('/api/admin/gallery', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album: name }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setListErr(d.error || 'Failed to delete album.'); return }
      setPhotos(prev => prev.filter(p => p.album !== name))
      setDeleteAlbum(null)
    } catch { setListErr('Network error — album not deleted.') }
  }

  function armDelete(id) {
    clearTimeout(armTimerRef.current)
    setArmedPhoto(id)
    armTimerRef.current = setTimeout(() => setArmedPhoto(null), 3000)
  }

  async function handleDeletePhoto(photo) {
    setArmedPhoto(null)
    try {
      const res = await fetch(`/api/admin/gallery/${photo.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setListErr(d.error || 'Failed to delete photo.'); return }
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
    } catch { setListErr('Network error — photo not deleted.') }
  }

  function savePhoto(row) {
    setPhotos(prev => prev.map(p => p.id === row.id ? { ...p, ...row } : p))
  }

  const tabBtn = (key, label) => (
    <button type="button" onClick={() => { setMode(key); setAdding(false); setFormErr(''); setPersonalMember(null) }}
      style={{
        padding: '0.5rem 1.1rem', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
        border: 'none', borderBottom: mode === key ? '2px solid #45643C' : '2px solid transparent',
        background: 'none', color: mode === key ? '#1a1a1a' : '#999', cursor: 'pointer',
        fontFamily: 'var(--font-inter),sans-serif', fontWeight: mode === key ? '600' : '400',
      }}>
      {label}
    </button>
  )

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', maxWidth: '1100px', fontFamily: 'var(--font-inter),sans-serif' }}>
      <style>{`
        @keyframes phFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .ph-body { animation: phFadeUp 0.25s ease both; }
        .ph-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.75rem; }
        @media (max-width: 480px) { .ph-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Photo Gallery</h1>
        <div style={{ fontSize: '12px', color: '#999', marginTop: '0.5rem' }}>
          Event Photos are visible to members who attended that event. Car &amp; Personal photos are private to that one member.
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
        {tabBtn('event', 'Event Photos')}
        {tabBtn('personal', 'Car & Personal')}
      </div>

      {listErr && <Err msg={listErr} />}

      {/* ── Upload progress (shared) ───────────────────────────────────── */}
      {upload && (
        <div className="ph-body" style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '12px', color: '#555' }}>
              {upload.done < upload.total
                ? <>Uploading to <strong>{upload.label}</strong> — {upload.done} / {upload.total}…</>
                : <>Finished uploading to <strong>{upload.label}</strong> ({Math.max(0, upload.total - upload.errors.length)} / {upload.total} succeeded)</>}
            </div>
            {upload.done >= upload.total && <GhostBtn small onClick={() => setUpload(null)}>Dismiss</GhostBtn>}
          </div>
          <div style={{ height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '99px', marginTop: '0.6rem', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${upload.total ? (upload.done / upload.total) * 100 : 100}%`, background: '#45643C', borderRadius: '99px', transition: 'width 0.3s ease' }} />
          </div>
          {upload.errors.map((e, i) => (
            <div key={i} style={{ fontSize: '11px', color: '#93333E', marginTop: '0.5rem' }}>{e}</div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>

      ) : mode === 'event' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <PrimaryBtn onClick={() => { setAdding(v => !v); setFormErr('') }}>{adding ? 'Cancel' : '+ New Event Album'}</PrimaryBtn>
          </div>

          {/* Hidden input for adding photos to an existing album */}
          <input ref={addFilesRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={e => {
              const target = addTargetRef.current
              if (target) uploadFiles({ category: 'event', album: target.name, albumDate: target.date || '', label: target.name }, e.target.files)
              e.target.value = ''
            }} />

          {adding && (
            <form onSubmit={handleNewAlbum} className="ph-body" style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', marginBottom: '1rem' }}>New Event Album</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <L>Event Name *</L>
                  <input style={inp} placeholder="Whips to Eastern Townships — July 5, 2026" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={120} />
                  <div style={{ fontSize: '10px', color: '#bbb', marginTop: '0.3rem' }}>Must match the event's name exactly — this is how we know which members attended and can view it.</div>
                </div>
                <div>
                  <L>Event Date</L>
                  <input type="date" style={{ ...inp, minWidth: 0 }} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <L>Photos *</L>
                  <input ref={newFilesRef} type="file" accept="image/*" multiple style={{ ...inp, padding: '0.55rem 0.9rem' }} />
                </div>
              </div>
              {formErr && <Err msg={formErr} />}
              <PrimaryBtn type="submit">Upload Photos</PrimaryBtn>
            </form>
          )}

          {albums.length === 0 && !adding && !upload ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#bbb', fontSize: '13px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px' }}>
              No event albums yet. Create one to start uploading.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {albums.map(album => (
                <div key={album.name} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: '#fafaf9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    {editing?.orig === album.name ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                        <input style={{ ...inp, flex: '1 1 200px' }} value={editing.name} maxLength={120} onChange={e => setEditing(ed => ({ ...ed, name: e.target.value }))} />
                        <input type="date" style={{ ...inp, width: '150px' }} value={editing.date || ''} onChange={e => setEditing(ed => ({ ...ed, date: e.target.value }))} />
                        <PrimaryBtn onClick={saveAlbumEdit}>Save</PrimaryBtn>
                        <GhostBtn onClick={() => setEditing(null)}>Cancel</GhostBtn>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>{album.name}</div>
                          <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                            {formatDate(album.date) ? `${formatDate(album.date)} · ` : ''}{album.photos.length} {album.photos.length === 1 ? 'photo' : 'photos'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <GhostBtn small onClick={() => { addTargetRef.current = album; addFilesRef.current?.click() }}>+ Add Photos</GhostBtn>
                          <GhostBtn small onClick={() => setEditing({ orig: album.name, name: album.name, date: album.date || '' })}>Edit</GhostBtn>
                          <DangerBtn small onClick={() => setDeleteAlbum(album.name)}>Delete</DangerBtn>
                        </div>
                      </>
                    )}
                  </div>

                  {deleteAlbum === album.name && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', margin: '1rem 1.25rem 0', padding: '0.6rem 0.85rem', background: 'rgba(147,51,62,0.05)', border: '0.5px solid rgba(147,51,62,0.2)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#93333E' }}>Delete this album and all {album.photos.length} {album.photos.length === 1 ? 'photo' : 'photos'} permanently?</span>
                      <DangerBtn small onClick={() => handleDeleteAlbum(album.name)}>Confirm Delete</DangerBtn>
                      <GhostBtn small onClick={() => setDeleteAlbum(null)}>Cancel</GhostBtn>
                    </div>
                  )}

                  <div className="ph-grid" style={{ padding: '1.25rem' }}>
                    {album.photos.map(photo => (
                      <PhotoTile key={photo.id} photo={photo} members={members} showTags
                        armedPhoto={armedPhoto} armDelete={armDelete} handleDeletePhoto={handleDeletePhoto} onSaved={savePhoto} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>

      ) : (
        <>
          {/* ── Car & Personal ─────────────────────────────────────────── */}
          <div style={{ marginBottom: '1.5rem' }}>
            <L>Find a member</L>
            <MemberSearchSelect members={members} placeholder="Search by name or email…" onSelect={m => setPersonalMember(m)} />
          </div>

          {personalMember && (
            <input ref={personalFilesRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
              onChange={e => {
                uploadFiles({ category: 'personal', memberId: personalMember.id, label: personalMember.name || personalMember.email }, e.target.files)
                e.target.value = ''
              }} />
          )}

          {personalMember && (
            <div className="ph-body" style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: '#fafaf9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>{personalMember.name || '(no name)'}</div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{personalMember.email}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <GhostBtn small onClick={() => personalFilesRef.current?.click()}>+ Add Photos</GhostBtn>
                  <GhostBtn small onClick={() => setPersonalMember(null)}>Close</GhostBtn>
                </div>
              </div>
              <div className="ph-grid" style={{ padding: '1.25rem' }}>
                {photos.filter(p => p.category === 'personal' && p.member_id === personalMember.id).length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#bbb', fontSize: '13px', padding: '1.5rem 0' }}>
                    No photos yet — click Add Photos to upload.
                  </div>
                ) : photos.filter(p => p.category === 'personal' && p.member_id === personalMember.id).map(photo => (
                  <PhotoTile key={photo.id} photo={photo} members={members}
                    armedPhoto={armedPhoto} armDelete={armDelete} handleDeletePhoto={handleDeletePhoto} onSaved={savePhoto} />
                ))}
              </div>
            </div>
          )}

          {personalGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#bbb', fontSize: '13px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px' }}>
              No member folders yet. Search for a member above to start one.
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', marginBottom: '0.75rem' }}>Existing folders</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {personalGroups.map(g => (
                  <button key={g.member?.id || 'unknown'} type="button" onClick={() => setPersonalMember(g.member)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{g.member?.name || '(no name)'}</div>
                      <div style={{ fontSize: '10px', color: '#999' }}>{g.member?.email}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>{g.photos.length} {g.photos.length === 1 ? 'photo' : 'photos'}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
