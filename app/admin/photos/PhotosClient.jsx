'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { inp, L, PrimaryBtn, GhostBtn, DangerBtn, Err, CopyBtn } from '../_components/shared'
import { useConfirm } from '../_components/ConfirmProvider'
import { uploadToR2 } from '../../../lib/uploadToR2'
import { onImgError } from '../../../lib/imgFallback'
import { compressImageClient } from '../../../lib/compressImageClient'
import { convertHeicIfNeeded, isHeicFile } from '../../../lib/convertHeicIfNeeded'
import { formatMbps } from '../../../lib/formatMbps'
import { MIME_TO_EXT } from '../../../lib/allowedImageTypes'
import AdminPhotoLightbox from '../_components/AdminPhotoLightbox'

const ALLOWED = MIME_TO_EXT

function formatDate(d) {
  if (!d) return null
  return new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
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

function PhotoTile({ photo, members, showTags, selected, onToggleSelect, onSaved, onImageClick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <button type="button" onClick={onImageClick}
        style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', background: 'rgba(0,0,0,0.04)', border: 'none', padding: 0, cursor: 'pointer', display: 'block', width: '100%' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.photo_url} alt={photo.caption || photo.album || ''} loading="lazy"
          onError={onImgError(photo.original_url)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        {/* Select for bulk delete — same affordance as the non-member share grid.
            Single delete lives in the lightbox. */}
        <span
          onClick={e => { e.stopPropagation(); onToggleSelect(photo.id) }}
          role="button" aria-label={selected ? 'Deselect photo' : 'Select photo'}
          style={{
            position: 'absolute', top: '6px', right: '6px', width: '24px', height: '24px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            background: selected ? '#45643C' : 'rgba(15,30,20,0.55)', border: '1.5px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}>
          {selected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
        </span>
        {photo.original_url && (
          <span
            onClick={e => { e.stopPropagation(); const a = document.createElement('a'); a.href = `${photo.original_url}?download`; a.rel = 'noreferrer'; a.click() }}
            role="button" aria-label="Download original"
            style={{ position: 'absolute', bottom: '6px', right: '6px', width: '26px', height: '26px', borderRadius: '99px', background: 'rgba(15,30,20,0.65)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          </span>
        )}
      </button>
      {showTags && <TagPicker photo={photo} members={members} onSaved={onSaved} />}
    </div>
  )
}

export default function PhotosClient() {
  const confirm = useConfirm()
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
  const [selectedPhotoIds, setSelectedPhotoIds] = useState(() => new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [personalMember, setPersonalMember] = useState(null)
  const [personalFolder, setPersonalFolder] = useState('') // folder (album) new personal uploads go into
  const [creatingPersonalFolder, setCreatingPersonalFolder] = useState(false) // toggles the "+ New Folder" form, mirroring the non-member photo-share "+ New Folder" pattern
  const [notifyStatus, setNotifyStatus] = useState({}) // { [memberId]: 'sending' | 'sent' | <error string> }
  const [submissionsCount, setSubmissionsCount] = useState(0)
  const [folderTitleSuggestions, setFolderTitleSuggestions] = useState([]) // shared across non-member folders + member event/personal albums — see the API route
  const [albumSearch, setAlbumSearch] = useState('')
  const [openAlbums, setOpenAlbums] = useState(() => new Set()) // expanded album names
  const autoOpenedRef = useRef(false)
  // { kind: 'event', key: albumName } | { kind: 'personal', key: memberId }, plus index —
  // stores a lookup key rather than a snapshot of the photos array so a
  // delete from inside the lightbox stays in sync with the live list.
  const [lightbox, setLightbox] = useState(null)
  const newFilesRef = useRef(null)
  const addFilesRef = useRef(null)
  const addTargetRef = useRef(null)
  const personalFilesRef = useRef(null)

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
    fetch('/api/admin/gallery-submissions').then(r => r.ok ? r.json() : []).then(d => setSubmissionsCount(Array.isArray(d) ? d.length : 0)).catch(() => {})
    // Every folder/album name used anywhere in the photo gallery section —
    // non-member share folders too, not just this page's own event/personal
    // albums — so the same event name can be reused exactly regardless of
    // which of the three forms it's typed into. See the API route.
    fetch('/api/admin/photos/folder-titles')
      .then(r => r.ok ? r.json() : { titles: [] })
      .then(data => setFolderTitleSuggestions(Array.isArray(data.titles) ? data.titles : []))
      .catch(() => {})
  }, [])


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

  // Album name filter (event tab). Personal folders use MemberSearchSelect.
  const albumQuery = albumSearch.trim().toLowerCase()
  const visibleAlbums = albumQuery ? albums.filter(a => (a.name || '').toLowerCase().includes(albumQuery)) : albums

  function toggleAlbum(name) {
    setOpenAlbums(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n })
  }

  // Open the newest album on first load so the page isn't a wall of collapsed
  // headers, but keep the rest collapsed so many-event galleries stay scannable.
  useEffect(() => {
    if (!autoOpenedRef.current && albums.length > 0) {
      autoOpenedRef.current = true
      setOpenAlbums(new Set([albums[0].name]))
    }
  }, [albums])

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

  const stats = useMemo(() => ({
    albums: albums.length,
    total: photos.length,
    folders: personalGroups.length,
    untagged: photos.filter(p => p.category === 'event' && !(p.tags || []).length).length,
  }), [albums.length, photos, personalGroups.length])

  // Looked up live from `photos` (via albums/personalGroups) rather than a
  // snapshot, so deleting a photo from inside the lightbox stays in sync.
  const lightboxGroup = !lightbox ? []
    : lightbox.kind === 'event' ? (albums.find(a => a.name === lightbox.key)?.photos || [])
    : (() => {
        // Personal photos are grouped into folders (album) in the grid, so the
        // lightbox steps through just the folder that was opened.
        const mp = photos.filter(p => p.category === 'personal' && p.member_id === lightbox.key)
        return lightbox.folderKey ? mp.filter(p => (p.album || '__general__') === lightbox.folderKey) : mp
      })()
  const lightboxPhotos = lightboxGroup.map(p => ({ id: p.id, url: p.photo_url, originalUrl: p.original_url, caption: p.caption }))

  // Uploads go browser → R2 directly via presigned URLs (full-size originals
  // exceed the serverless request-body limit). Two files are sent per photo:
  // the untouched original (full-resolution download) and a
  // client-compressed display copy (grid/lightbox) — an on-the-fly image
  // transform endpoint proved unreliable for large camera originals
  // (broken-image icon, or slow enough to look broken), so the display copy
  // is a real small file rather than a live-transformed URL. HEIC/HEIF files
  // (iOS default when not auto-converted) are converted to JPEG first — no
  // browser but Safari can display a raw .heic file.
  async function uploadFiles({ category, album, albumDate, memberId, label }, fileList) {
    const all = Array.from(fileList || [])
    const files = all.filter(f => ALLOWED[f.type] || isHeicFile(f))
    const skipped = all.filter(f => !ALLOWED[f.type] && !isHeicFile(f)).map(f => `${f.name} — unsupported format`)
    if (!all.length) return
    setUpload({ label, done: 0, total: files.length, errors: skipped, bytes: 0, ms: 0 })
    for (let i = 0; i < files.length; i++) {
      let file = files[i]
      try {
        file = await convertHeicIfNeeded(file)
        if (!ALLOWED[file.type]) throw new Error('could not be converted from HEIC — try exporting as JPEG first')
        if (file.size > 100 * 1024 * 1024) throw new Error('over the 100 MB per-file limit')
        const display = await compressImageClient(file)
        const urlRes = await fetch('/api/admin/gallery/upload-url', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origExt: ALLOWED[file.type], dispExt: ALLOWED[display.type] || 'jpg' }),
        })
        const urls = await urlRes.json().catch(() => ({}))
        if (!urlRes.ok) throw new Error(urls.error || `HTTP ${urlRes.status}`)
        // Both files transfer concurrently — measure wall-clock time around
        // the pair so the speed reflects actual throughput, not the sum of
        // two sequential durations.
        const pairStarted = performance.now()
        await Promise.all([
          uploadToR2({ uploadUrl: urls.originalUploadUrl, file }),
          uploadToR2({ uploadUrl: urls.displayUploadUrl, file: display }),
        ])
        const pairMs = performance.now() - pairStarted
        const pairBytes = file.size + display.size
        setUpload(u => u ? { ...u, bytes: u.bytes + pairBytes, ms: u.ms + pairMs } : u)
        const res = await fetch('/api/admin/gallery', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, album, albumDate: albumDate || '', memberId, originalPath: urls.originalPath, displayPath: urls.displayPath }),
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

  function togglePhotoSelect(id) {
    setSelectedPhotoIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleDeletePhoto(photo) {
    try {
      const res = await fetch(`/api/admin/gallery/${photo.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setListErr(d.error || 'Failed to delete photo.'); return }
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      setSelectedPhotoIds(prev => { if (!prev.has(photo.id)) return prev; const n = new Set(prev); n.delete(photo.id); return n })
    } catch { setListErr('Network error — photo not deleted.') }
  }

  // Bulk delete the selected photos — same model as the non-member share grid.
  async function bulkDeletePhotos() {
    const ids = [...selectedPhotoIds]
    if (!ids.length) return
    setBulkDeleting(true); setListErr('')
    const results = await Promise.allSettled(ids.map(id =>
      fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' }).then(r => { if (!r.ok) throw new Error() })))
    const okIds = new Set(ids.filter((id, i) => results[i].status === 'fulfilled'))
    setPhotos(prev => prev.filter(p => !okIds.has(p.id)))
    const failed = ids.length - okIds.size
    setSelectedPhotoIds(new Set())
    setBulkDeleting(false)
    if (failed > 0) setListErr(`${failed} of ${ids.length} photo${ids.length === 1 ? '' : 's'} couldn’t be deleted.`)
  }

  function savePhoto(row) {
    setPhotos(prev => prev.map(p => p.id === row.id ? { ...p, ...row } : p))
  }

  // Caption editing happens in the lightbox — same as the non-member share
  // side (AdminPhotoLightbox's onSaveCaption), so both admin photo areas edit
  // captions identically.
  async function handleSaveCaption(photoId, caption) {
    try {
      const res = await fetch(`/api/admin/gallery/${photoId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caption }),
      })
      if (res.ok) savePhoto(await res.json())
    } catch {}
  }

  async function notifyMember(m) {
    if (!(await confirm({
      title: 'Notify this member?',
      message: 'This emails the member to let them know their photos are ready to view.',
      details: <><strong>{m.name || '—'}</strong>{m.email ? <> · {m.email}</> : null}</>,
      confirmLabel: 'Yes, notify',
    }))) return
    setNotifyStatus(s => ({ ...s, [m.id]: 'sending' }))
    try {
      const res = await fetch(`/api/admin/members/${m.id}/notify-photos`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      setNotifyStatus(s => ({ ...s, [m.id]: res.ok ? 'sent' : (data.error || 'Failed to send.') }))
      if (res.ok) setTimeout(() => setNotifyStatus(s => ({ ...s, [m.id]: undefined })), 3000)
    } catch {
      setNotifyStatus(s => ({ ...s, [m.id]: 'Network error.' }))
    }
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
    <div className="ph-wrap" style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', fontFamily: 'var(--font-inter),sans-serif' }}>
      <style>{`
        @keyframes phFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .ph-body { animation: phFadeUp 0.25s ease both; }
        .ph-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.75rem; }
        @media (max-width: 480px) { .ph-grid { grid-template-columns: repeat(2, 1fr); } }
        .ph-albumhead:hover { background: #f5f4f2 !important; }
        /* iOS zooms in when a focused input's font-size is under 16px. Caption
           and search inputs here are 11–13px, so bump to 16px on touch only. */
        @media (pointer: coarse) { .ph-wrap input, .ph-wrap select, .ph-wrap textarea { font-size: 16px !important; } }
      `}</style>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase', color: '#c5a882', marginBottom: '0.5rem' }}>Admin</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '30px', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Photo Gallery</h1>
        <div style={{ fontSize: '12px', color: '#999', marginTop: '0.5rem' }}>
          Event Photos are visible to members who attended that event. Car &amp; Personal photos are private to that one member.
        </div>
      </div>

      {/* Stats bar */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Event Albums', value: stats.albums, color: '#1a1a1a' },
            { label: 'Total Photos', value: stats.total, color: '#45643C' },
            { label: 'Member Folders', value: stats.folders, color: '#1a1a1a' },
            { label: 'Untagged Event', value: stats.untagged, color: stats.untagged ? '#8A6535' : '#1a1a1a' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '10px', boxShadow: '0 1px 5px rgba(0,0,0,0.04)', padding: '0.85rem 1rem' }}>
              <div style={{ fontFamily: "'Bebas Neue',var(--font-bebas),sans-serif", fontSize: '1.6rem', fontWeight: '400', color: s.color, lineHeight: 1, letterSpacing: '0.03em' }}>{s.value}</div>
              <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#999', marginTop: '0.4rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
        {tabBtn('event', 'Event Photos')}
        {tabBtn('personal', 'Car & Personal')}
        <Link href="/admin/photos/shares" style={{
          padding: '0.5rem 1.1rem', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
          border: 'none', borderBottom: '2px solid transparent',
          color: '#999', textDecoration: 'none',
          fontFamily: 'var(--font-inter),sans-serif', fontWeight: '400',
        }}>
          Non-Member Shares →
        </Link>
        <Link href="/admin/photos/submissions" style={{
          padding: '0.5rem 1.1rem', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
          border: 'none', borderBottom: '2px solid transparent',
          color: '#999', textDecoration: 'none',
          fontFamily: 'var(--font-inter),sans-serif', fontWeight: '400',
        }}>
          Submissions{submissionsCount > 0 ? ` (${submissionsCount})` : ''} →
        </Link>
      </div>

      {listErr && <Err msg={listErr} />}

      {/* Bulk-delete bar — same select-then-delete model as the non-member grid */}
      {selectedPhotoIds.size > 0 && (
        <div style={{ position: 'sticky', top: '0.5rem', zIndex: 6, background: '#0F1E14', color: '#F5F1EC', borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
          <span style={{ fontSize: '12px', fontWeight: 500 }}>{selectedPhotoIds.size} selected</span>
          <button onClick={() => setSelectedPhotoIds(new Set())} disabled={bulkDeleting}
            style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 8px', background: 'none', border: 'none', color: 'rgba(245,241,236,0.6)', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
            Clear
          </button>
          <button onClick={bulkDeletePhotos} disabled={bulkDeleting}
            style={{ marginLeft: 'auto', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px', background: '#93333E', color: '#F5F1EC', border: 'none', borderRadius: '6px', cursor: bulkDeleting ? 'default' : 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
            {bulkDeleting ? 'Deleting…' : `Delete ${selectedPhotoIds.size}`}
          </button>
        </div>
      )}

      {/* ── Upload progress (shared) ───────────────────────────────────── */}
      {upload && (
        <div className="ph-body" style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '12px', color: '#555' }}>
              {upload.done < upload.total
                ? <>Uploading to <strong>{upload.label}</strong> — {upload.done} / {upload.total}…</>
                : <>Finished uploading to <strong>{upload.label}</strong> ({Math.max(0, upload.total - upload.errors.length)} / {upload.total} succeeded)</>}
              {formatMbps(upload.bytes, upload.ms) != null && (
                <span style={{ color: '#999' }}> · {formatMbps(upload.bytes, upload.ms).toFixed(1)} Mbps</span>
              )}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {albums.length > 0 ? (
              <input value={albumSearch} onChange={e => setAlbumSearch(e.target.value)} placeholder="Search albums…"
                style={{ ...inp, maxWidth: '260px', padding: '0.5rem 0.85rem' }} />
            ) : <span />}
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
                  <input style={inp} list="ph-event-album-names" placeholder="Whips to Eastern Townships — July 5, 2026" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={120} />
                  <datalist id="ph-event-album-names">
                    {folderTitleSuggestions.map(a => <option key={a} value={a} />)}
                  </datalist>
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
              {visibleAlbums.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#bbb', fontSize: '13px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px' }}>
                  No albums match “{albumSearch.trim()}”.
                </div>
              ) : visibleAlbums.map(album => {
                const isOpen = openAlbums.has(album.name) || editing?.orig === album.name
                return (
                <div key={album.name} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: isOpen ? '0.5px solid rgba(0,0,0,0.06)' : 'none', background: '#fafaf9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    {editing?.orig === album.name ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                        <input style={{ ...inp, flex: '1 1 200px' }} value={editing.name} maxLength={120} onChange={e => setEditing(ed => ({ ...ed, name: e.target.value }))} />
                        <input type="date" style={{ ...inp, width: '150px' }} value={editing.date || ''} onChange={e => setEditing(ed => ({ ...ed, date: e.target.value }))} />
                        <PrimaryBtn onClick={saveAlbumEdit}>Save</PrimaryBtn>
                        <GhostBtn onClick={() => setEditing(null)}>Cancel</GhostBtn>
                      </div>
                    ) : (
                      <>
                        <button type="button" className="ph-albumhead" onClick={() => toggleAlbum(album.name)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '0.25rem', margin: '-0.25rem', borderRadius: '8px', transition: 'background 0.12s' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5" style={{ flexShrink: 0, transition: 'transform 0.15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}><polyline points="9 6 15 12 9 18" /></svg>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.name}</div>
                            <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                              {formatDate(album.date) ? `${formatDate(album.date)} · ` : ''}{album.photos.length} {album.photos.length === 1 ? 'photo' : 'photos'}
                            </div>
                          </div>
                        </button>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <GhostBtn small disabled={!!upload} onClick={() => { addTargetRef.current = album; addFilesRef.current?.click() }}>+ Add Photos</GhostBtn>
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

                  {isOpen ? (
                    <div className="ph-grid" style={{ padding: '1.25rem' }}>
                      {album.photos.map((photo, i) => (
                        <PhotoTile key={photo.id} photo={photo} members={members} showTags
                          selected={selectedPhotoIds.has(photo.id)} onToggleSelect={togglePhotoSelect} onSaved={savePhoto}
                          onImageClick={() => setLightbox({ kind: 'event', key: album.name, index: i })} />
                      ))}
                    </div>
                  ) : (
                    /* Collapsed: a scannable thumbnail strip; click to expand */
                    <button type="button" onClick={() => toggleAlbum(album.name)}
                      style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', width: '100%', padding: '0.85rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', overflowX: 'auto' }}>
                      {album.photos.slice(0, 8).map(photo => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={photo.id} src={photo.photo_url} alt="" loading="lazy" onError={onImgError(photo.original_url)}
                          style={{ width: '54px', height: '54px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                      ))}
                      {album.photos.length > 8 && (
                        <span style={{ fontSize: '11px', color: '#8A6535', flexShrink: 0, paddingLeft: '0.35rem', whiteSpace: 'nowrap' }}>+{album.photos.length - 8} more</span>
                      )}
                    </button>
                  )}
                </div>
                )
              })}
            </div>
          )}
        </>

      ) : (
        <>
          {/* ── Car & Personal ─────────────────────────────────────────── */}
          <div style={{ marginBottom: '1.5rem' }}>
            <L>Find a member</L>
            <MemberSearchSelect members={members} placeholder="Search by name or email…" onSelect={m => { setPersonalMember(m); setPersonalFolder('') }} />
          </div>

          {personalMember && (
            <input ref={personalFilesRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
              onChange={e => {
                uploadFiles({ category: 'personal', album: personalFolder.trim(), memberId: personalMember.id, label: personalMember.name || personalMember.email }, e.target.files)
                e.target.value = ''
              }} />
          )}

          {personalMember && (
            <div className="ph-body" style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: '#fafaf9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>{personalMember.name || '(no name)'}</div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '0.1rem', wordBreak: 'break-all' }}>{personalMember.email}<CopyBtn value={personalMember.email} /></div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <PrimaryBtn onClick={() => setCreatingPersonalFolder(v => !v)}>{creatingPersonalFolder ? 'Cancel' : '+ New Folder'}</PrimaryBtn>
                  <GhostBtn small disabled={!!upload} onClick={() => personalFilesRef.current?.click()}>+ Add Photos</GhostBtn>
                  <GhostBtn small disabled={notifyStatus[personalMember.id] === 'sending'} onClick={() => notifyMember(personalMember)}>
                    {notifyStatus[personalMember.id] === 'sending' ? 'Sending…'
                      : notifyStatus[personalMember.id] === 'sent' ? '✓ Sent'
                      : notifyStatus[personalMember.id] ? 'Retry'
                      : `Notify ${personalMember.name?.split(' ')[0] || 'member'}`}
                  </GhostBtn>
                  <GhostBtn small onClick={() => { setPersonalMember(null); setPersonalFolder(''); setCreatingPersonalFolder(false) }}>Close</GhostBtn>
                </div>
                {notifyStatus[personalMember.id] && !['sending', 'sent'].includes(notifyStatus[personalMember.id]) && (
                  <div style={{ fontSize: '11px', color: '#93333E', width: '100%' }}>{notifyStatus[personalMember.id]}</div>
                )}
              </div>

              {/* "+ New Folder" form — mirrors the non-member photo-share
                  "+ New Folder" pattern (PersonClient.jsx). There's no
                  standalone folder row to insert here (a personal folder is
                  just gallery_photos.album, it only really exists once it
                  has a photo in it) — submitting sets the active folder name
                  and immediately opens the file picker, which is the closest
                  honest equivalent of "creating" it. Also doubles as "add
                  more to an existing folder" via the datalist, same as the
                  input it replaced. */}
              {creatingPersonalFolder && (
                <form onSubmit={e => { e.preventDefault(); setCreatingPersonalFolder(false); personalFilesRef.current?.click() }}
                  style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: '#fff', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 220px' }}>
                    <L>Folder name (e.g. the event name)</L>
                    <input style={inp} list={`ph-folders-${personalMember.id}`} value={personalFolder} onChange={e => setPersonalFolder(e.target.value)}
                      placeholder="Leave blank for General" maxLength={120} autoFocus />
                    <datalist id={`ph-folders-${personalMember.id}`}>
                      {folderTitleSuggestions.map(a => <option key={a} value={a} />)}
                    </datalist>
                  </div>
                  <PrimaryBtn type="submit">Choose Photos…</PrimaryBtn>
                </form>
              )}
              <div style={{ padding: '1.25rem' }}>
                {(() => {
                  const mp = photos.filter(p => p.category === 'personal' && p.member_id === personalMember.id)
                  if (mp.length === 0) return (
                    <div style={{ textAlign: 'center', color: '#bbb', fontSize: '13px', padding: '1.5rem 0' }}>
                      No photos yet — click "+ New Folder" to name one (optional), or "+ Add Photos" to upload straight into General.
                    </div>
                  )
                  // Group into folders (album); null-album photos are "General".
                  const groups = new Map()
                  for (const p of mp) {
                    const key = p.album || '__general__'
                    if (!groups.has(key)) groups.set(key, { key, name: p.album || 'General', photos: [] })
                    groups.get(key).photos.push(p)
                  }
                  const folderList = [...groups.values()]
                  const showHeaders = folderList.length > 1 || folderList[0].key !== '__general__'
                  return folderList.map(folder => (
                    <div key={folder.key} style={{ marginBottom: '1.25rem' }}>
                      {showHeaders && (
                        <div style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A6535', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                          {folder.name} · {folder.photos.length}
                        </div>
                      )}
                      <div className="ph-grid">
                        {folder.photos.map((photo, i) => (
                          <PhotoTile key={photo.id} photo={photo} members={members}
                            selected={selectedPhotoIds.has(photo.id)} onToggleSelect={togglePhotoSelect} onSaved={savePhoto}
                            onImageClick={() => setLightbox({ kind: 'personal', key: personalMember.id, folderKey: folder.key, index: i })} />
                        ))}
                      </div>
                    </div>
                  ))
                })()}
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
                  <div key={g.member?.id || 'unknown'} role="button" tabIndex={0} onClick={() => { setPersonalMember(g.member); setPersonalFolder(''); setCreatingPersonalFolder(false) }}
                    onKeyDown={e => { if (e.key === 'Enter') { setPersonalMember(g.member); setPersonalFolder(''); setCreatingPersonalFolder(false) } }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif', gap: '0.75rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{g.member?.name || '(no name)'}</div>
                      <div style={{ fontSize: '10px', color: '#999', display: 'inline-flex', alignItems: 'center', gap: '0.1rem', wordBreak: 'break-all' }}>{g.member?.email}<CopyBtn value={g.member?.email} /></div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#999', flexShrink: 0 }}>{g.photos.length} {g.photos.length === 1 ? 'photo' : 'photos'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <AdminPhotoLightbox photos={lightboxPhotos} openIndex={lightbox?.index ?? null}
        onNavigate={i => setLightbox(l => l ? { ...l, index: i } : l)}
        onClose={() => setLightbox(null)}
        onDelete={id => handleDeletePhoto({ id })}
        onSaveCaption={handleSaveCaption} />
    </div>
  )
}
