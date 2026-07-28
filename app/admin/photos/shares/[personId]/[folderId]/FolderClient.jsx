'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { inp, L, PrimaryBtn, GhostBtn, DangerBtn, Err } from '../../../../_components/shared'
import AdminPhotoLightbox from '../../../../_components/AdminPhotoLightbox'
import { uploadToSupabaseStorage } from '../../../../../../lib/uploadToSupabaseStorage'
import { onImgError } from '../../../../../../lib/imgFallback'
import { compressImageClient } from '../../../../../../lib/compressImageClient'
import { convertHeicIfNeeded, isHeicFile } from '../../../../../../lib/convertHeicIfNeeded'
import { formatMbps } from '../../../../../../lib/formatMbps'
import { MIME_TO_EXT } from '../../../../../../lib/allowedImageTypes'

const ALLOWED = MIME_TO_EXT

function siteUrl() {
  return typeof window !== 'undefined' ? window.location.origin : ''
}
function daysLeft(expiresAt) {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function FolderClient() {
  const { personId, folderId } = useParams()
  const router = useRouter()
  const [person, setPerson] = useState(null)
  const [folder, setFolder] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [copied, setCopied] = useState(false)
  const [upload, setUpload] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [savingTitle, setSavingTitle] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileRef = useRef(null)

  function load() {
    Promise.all([
      fetch(`/api/admin/photo-share-people/${personId}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/admin/photo-share-people/${personId}/folders/${folderId}`).then(r => r.ok ? r.json() : Promise.reject()),
    ])
      .then(([personData, folderData]) => {
        setPerson(personData)
        setFolder(folderData)
        setPhotos(folderData.photos || [])
        setLoading(false)
      })
      .catch(() => { setErr('Failed to load — this folder may not exist.'); setLoading(false) })
  }
  useEffect(load, [personId, folderId])

  function copyLink() {
    if (!person) return
    navigator.clipboard?.writeText(`${siteUrl()}/gallery/${person.token}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  async function handleFiles(e) {
    const all = Array.from(e.target.files || [])
    if (fileRef.current) fileRef.current.value = ''
    const files = all.filter(f => ALLOWED[f.type] || isHeicFile(f))
    const skipped = all.filter(f => !ALLOWED[f.type] && !isHeicFile(f)).map(f => `${f.name} — unsupported format`)
    if (!all.length) return
    setUpload({ done: 0, total: files.length, errors: skipped, bytes: 0, ms: 0 })
    for (let i = 0; i < files.length; i++) {
      let file = files[i]
      try {
        file = await convertHeicIfNeeded(file)
        if (!ALLOWED[file.type]) throw new Error('could not be converted from HEIC — try exporting as JPEG first')
        if (file.size > 40 * 1024 * 1024) throw new Error('over the 40 MB per-file limit')
        const display = await compressImageClient(file)
        const urlRes = await fetch(`/api/admin/photo-share-people/${personId}/folders/${folderId}/upload-url`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileType: file.type, dispFileType: display.type || 'image/jpeg' }),
        })
        const urls = await urlRes.json().catch(() => ({}))
        if (!urlRes.ok) throw new Error(urls.error || `HTTP ${urlRes.status}`)
        const pairStarted = performance.now()
        await Promise.all([
          uploadToSupabaseStorage({ bucket: 'photo-shares', path: urls.originalPath, token: urls.originalToken, file }),
          uploadToSupabaseStorage({ bucket: 'photo-shares', path: urls.displayPath, token: urls.displayToken, file: display }),
        ])
        const pairMs = performance.now() - pairStarted
        setUpload(u => u ? { ...u, bytes: u.bytes + file.size + display.size, ms: u.ms + pairMs } : u)
        const res = await fetch(`/api/admin/photo-share-people/${personId}/folders/${folderId}/photos`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ originalPath: urls.originalPath, displayPath: urls.displayPath }),
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

  async function handleDeletePhoto(photoId) {
    try {
      const res = await fetch(`/api/admin/photo-share-people/${personId}/folders/${folderId}/photos/${photoId}`, { method: 'DELETE' })
      if (!res.ok) { setErr('Failed to delete photo.'); return }
      setPhotos(prev => prev.filter(p => p.id !== photoId))
    } catch { setErr('Network error — photo not deleted.') }
  }

  function startEditTitle() { setTitleDraft(folder.title); setEditingTitle(true) }
  async function saveTitle() {
    if (!titleDraft.trim()) return
    setSavingTitle(true)
    try {
      const res = await fetch(`/api/admin/photo-share-people/${personId}/folders/${folderId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: titleDraft.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(data.error || 'Failed to rename.'); return }
      setFolder(f => ({ ...f, ...data })); setEditingTitle(false)
    } catch { setErr('Network error.') }
    finally { setSavingTitle(false) }
  }

  async function handleRenew() {
    setRenewing(true)
    try {
      const res = await fetch(`/api/admin/photo-share-people/${personId}/folders/${folderId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ renew: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(data.error || 'Failed to renew.'); return }
      setFolder(f => ({ ...f, ...data }))
    } catch { setErr('Network error.') }
    finally { setRenewing(false) }
  }

  async function handleDeleteFolder() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/photo-share-people/${personId}/folders/${folderId}`, { method: 'DELETE' })
      if (!res.ok) { setErr('Failed to delete folder.'); setDeleting(false); return }
      router.push(`/admin/photos/shares/${personId}`)
    } catch { setErr('Network error.'); setDeleting(false) }
  }

  if (loading) {
    return <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', fontSize: '13px', color: '#ccc', textAlign: 'center' }}>Loading…</div>
  }
  if (!folder) {
    return (
      <div style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
        <Link href={`/admin/photos/shares/${personId}`} style={{ fontSize: '11px', color: '#999', textDecoration: 'none' }}>← Back</Link>
        <Err msg={err || 'Not found.'} />
      </div>
    )
  }

  const left = daysLeft(folder.expires_at)
  const lightboxPhotos = photos.map(p => ({ id: p.id, url: p.url, originalUrl: p.originalUrl }))

  return (
    <div className="shp-wrap" style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', fontFamily: 'var(--font-inter),sans-serif' }}>
      <style>{`
        .shp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.75rem; }
        @media (max-width: 480px) { .shp-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      <Link href={`/admin/photos/shares/${personId}`} style={{ fontSize: '11px', color: '#999', textDecoration: 'none' }}>
        ← {person?.name || person?.email || 'Back'}
      </Link>

      <div style={{ marginTop: '0.75rem', marginBottom: '1.5rem' }}>
        {!editingTitle ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(1.8rem,4vw,2.4rem)', fontWeight: '300', color: '#1a1a1a', margin: 0, letterSpacing: '-0.01em' }}>
              {folder.title}
            </h1>
            <button type="button" onClick={startEditTitle} style={{ background: 'none', border: 'none', color: '#8a7a5c', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px', fontFamily: 'var(--font-inter),sans-serif', padding: 0 }}>Rename</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', maxWidth: '480px' }}>
            <input style={{ ...inp, flex: '1 1 240px' }} value={titleDraft} onChange={e => setTitleDraft(e.target.value)} maxLength={120} autoFocus />
            <PrimaryBtn onClick={saveTitle} disabled={savingTitle}>{savingTitle ? 'Saving…' : 'Save'}</PrimaryBtn>
            <GhostBtn onClick={() => setEditingTitle(false)}>Cancel</GhostBtn>
          </div>
        )}
        <div style={{ fontSize: '11px', color: left <= 5 ? '#93333E' : '#999', marginTop: '0.4rem' }}>
          {left <= 0 ? 'Expired' : `${left} day${left !== 1 ? 's' : ''} left`} · removes on {fmtDate(folder.expires_at)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button type="button" onClick={copyLink} title={copied ? 'Copied!' : "Copy this person's link"}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.5rem 0.9rem', background: 'none', border: `0.5px solid ${copied ? '#3B6B2F' : 'rgba(0,0,0,0.2)'}`, borderRadius: '8px', cursor: 'pointer', color: copied ? '#3B6B2F' : '#555', fontFamily: 'var(--font-inter),sans-serif' }}>
          {copied ? 'Copied ✓' : 'Copy link'}
        </button>
        <GhostBtn small onClick={handleRenew} disabled={renewing}>{renewing ? 'Renewing…' : 'Renew 30 days'}</GhostBtn>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFiles} />
        <PrimaryBtn onClick={() => fileRef.current?.click()} disabled={!!upload}>+ Add Photos</PrimaryBtn>
        {!deleteConfirm ? (
          <button type="button" onClick={() => setDeleteConfirm(true)}
            style={{ background: 'none', border: 'none', color: '#c99', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-inter),sans-serif' }}>
            Delete folder
          </button>
        ) : (
          <>
            <span style={{ fontSize: '11px', color: '#93333E' }}>Delete this folder and all its photos?</span>
            <DangerBtn small onClick={handleDeleteFolder} disabled={deleting}>{deleting ? '…' : 'Delete'}</DangerBtn>
            <GhostBtn small onClick={() => setDeleteConfirm(false)}>Cancel</GhostBtn>
          </>
        )}
      </div>

      {upload && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '12px', color: '#555' }}>
            {upload.done < upload.total ? <>Uploading {upload.done} / {upload.total}…</> : <>Uploaded {Math.max(0, upload.total - upload.errors.length)} / {upload.total}</>}
            {formatMbps(upload.bytes, upload.ms) != null && (
              <span style={{ color: '#999' }}> · {formatMbps(upload.bytes, upload.ms).toFixed(1)} Mbps</span>
            )}
          </div>
          <div style={{ height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '99px', marginTop: '0.5rem', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${upload.total ? (upload.done / upload.total) * 100 : 100}%`, background: '#45643C', borderRadius: '99px', transition: 'width 0.3s ease' }} />
          </div>
          {upload.errors.map((e, i) => <div key={i} style={{ fontSize: '12px', color: '#93333E', marginTop: '0.4rem' }}>{e}</div>)}
        </div>
      )}
      {err && <Err msg={err} />}

      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#bbb', fontSize: '13px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px' }}>
          No photos yet — click "+ Add Photos" to upload.
        </div>
      ) : (
        <div className="shp-grid">
          {photos.map((photo, i) => (
            <button key={photo.id} type="button" onClick={() => setLightboxIndex(i)}
              style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', background: 'rgba(0,0,0,0.04)', border: 'none', padding: 0, cursor: 'pointer', display: 'block' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" onError={onImgError(photo.originalUrl)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          ))}
        </div>
      )}

      <AdminPhotoLightbox photos={lightboxPhotos} openIndex={lightboxIndex} onNavigate={setLightboxIndex} onClose={() => setLightboxIndex(null)} onDelete={handleDeletePhoto} />
    </div>
  )
}
