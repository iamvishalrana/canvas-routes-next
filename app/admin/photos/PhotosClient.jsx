'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { inp, L, PrimaryBtn, GhostBtn, DangerBtn, Err } from '../_components/shared'

// Downscale large photos in the browser before upload — keeps each request well
// under serverless body limits and storage small. Falls back to the original
// file on any failure (the server still enforces the 10 MB cap).
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

export default function PhotosClient() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [listErr, setListErr] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', date: '' })
  const [formErr, setFormErr] = useState('')
  const [upload, setUpload] = useState(null) // { album, done, total, errors: [] }
  const [editing, setEditing] = useState(null) // { orig, name, date }
  const [deleteAlbum, setDeleteAlbum] = useState(null)
  const [armedPhoto, setArmedPhoto] = useState(null)
  const newFilesRef = useRef(null)
  const addFilesRef = useRef(null)
  const addTargetRef = useRef(null)
  const armTimerRef = useRef(null)

  useEffect(() => {
    fetch('/api/admin/gallery')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => { setPhotos(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setListErr('Failed to load photos.'); setLoading(false) })
  }, [])

  useEffect(() => () => clearTimeout(armTimerRef.current), [])

  const albums = useMemo(() => {
    const map = new Map()
    for (const p of photos) {
      if (!map.has(p.album)) map.set(p.album, { name: p.album, date: p.album_date, photos: [] })
      const a = map.get(p.album)
      a.photos.push(p)
      if (p.album_date && !a.date) a.date = p.album_date
    }
    return [...map.values()].sort((x, y) => (y.date || '0000').localeCompare(x.date || '0000'))
  }, [photos])

  async function uploadFiles(album, albumDate, fileList) {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'))
    if (!files.length) return
    setUpload({ album, done: 0, total: files.length, errors: [] })
    for (let i = 0; i < files.length; i++) {
      try {
        const file = await compressImage(files[i])
        const fd = new FormData()
        fd.append('photo', file)
        fd.append('album', album)
        if (albumDate) fd.append('albumDate', albumDate)
        const res = await fetch('/api/admin/gallery', { method: 'POST', body: fd })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
        setPhotos(prev => [...prev, data])
      } catch (err) {
        const name = files[i].name
        setUpload(u => u ? { ...u, errors: [...u.errors, `${name} — ${err.message}`] } : u)
      }
      setUpload(u => u ? { ...u, done: i + 1 } : u)
    }
    setUpload(u => u && u.errors.length ? u : null)
  }

  async function handleNewAlbum(e) {
    e.preventDefault()
    const files = newFilesRef.current?.files
    if (!form.name.trim()) { setFormErr('Album name is required.'); return }
    if (!files?.length) { setFormErr('Select at least one photo.'); return }
    setFormErr('')
    const name = form.name.trim()
    const date = form.date
    setAdding(false)
    setForm({ name: '', date: '' })
    await uploadFiles(name, date, files)
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

  return (
    <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', maxWidth: '1100px', fontFamily: 'var(--font-inter),sans-serif' }}>
      <style>{`
        @keyframes phFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .ph-body { animation: phFadeUp 0.25s ease both; }
        .ph-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.75rem; }
        @media (max-width: 480px) { .ph-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
          <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Photo Gallery</h1>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '0.5rem' }}>Photos appear in the members portal at /members/photos.</div>
        </div>
        <PrimaryBtn onClick={() => { setAdding(v => !v); setFormErr('') }}>{adding ? 'Cancel' : '+ New Album'}</PrimaryBtn>
      </div>

      {/* Hidden input for adding photos to an existing album */}
      <input ref={addFilesRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => {
          const target = addTargetRef.current
          if (target) uploadFiles(target.name, target.date || '', e.target.files)
          e.target.value = ''
        }} />

      {/* New album form */}
      {adding && (
        <form onSubmit={handleNewAlbum} className="ph-body" style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#999', marginBottom: '1rem' }}>New Album</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <L>Album Name *</L>
              <input style={inp} placeholder="Whips to Eastern Townships — July 5, 2026" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={120} />
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

      {/* Upload progress */}
      {upload && (
        <div className="ph-body" style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '12px', color: '#555' }}>
              {upload.done < upload.total
                ? <>Uploading to <strong>{upload.album}</strong> — {upload.done} / {upload.total}…</>
                : <>Finished uploading to <strong>{upload.album}</strong> ({upload.total - upload.errors.length} / {upload.total} succeeded)</>}
            </div>
            {upload.done >= upload.total && <GhostBtn small onClick={() => setUpload(null)}>Dismiss</GhostBtn>}
          </div>
          <div style={{ height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '99px', marginTop: '0.6rem', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(upload.done / upload.total) * 100}%`, background: '#45643C', borderRadius: '99px', transition: 'width 0.3s ease' }} />
          </div>
          {upload.errors.map((e, i) => (
            <div key={i} style={{ fontSize: '11px', color: '#93333E', marginTop: '0.5rem' }}>{e}</div>
          ))}
        </div>
      )}

      {listErr && <Err msg={listErr} />}

      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '13px', color: '#ccc' }}>Loading…</div>
      ) : albums.length === 0 && !adding && !upload ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#bbb', fontSize: '13px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px' }}>
          No albums yet. Create one to start uploading member photos.
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
                  <div key={photo.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', background: 'rgba(0,0,0,0.04)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.photo_url} alt={photo.caption || photo.album} loading="lazy"
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
                    <CaptionInput photo={photo} onSaved={row => setPhotos(prev => prev.map(p => p.id === row.id ? row : p))} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
