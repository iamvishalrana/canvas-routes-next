'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { inp, L, PrimaryBtn, GhostBtn, DangerBtn, Err } from '../../../../_components/shared'
import { useConfirm } from '../../../../_components/ConfirmProvider'
import AdminPhotoLightbox from '../../../../_components/AdminPhotoLightbox'
import { uploadToR2 } from '../../../../../../lib/uploadToR2'
import { onImgError } from '../../../../../../lib/imgFallback'
import { compressImageClient } from '../../../../../../lib/compressImageClient'
import { convertHeicIfNeeded, isHeicFile } from '../../../../../../lib/convertHeicIfNeeded'
import { convertTiffIfNeeded, isTiffFile } from '../../../../../../lib/convertTiffIfNeeded'
import { formatMbps } from '../../../../../../lib/formatMbps'
import { MIME_TO_EXT } from '../../../../../../lib/allowedImageTypes'
import { sha256Hex } from '../../../../../../lib/hashFile'

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
  const confirm = useConfirm()
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
  const [editingExpiry, setEditingExpiry] = useState(false)
  const [expiryDraft, setExpiryDraft] = useState('')
  const [savingExpiry, setSavingExpiry] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [notifyResult, setNotifyResult] = useState(null) // { ok } | { error }
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

  // Notifies this person that their photos are ready to view — same "Notify"
  // action the member gallery uses, kept consistent across both. Emails their
  // private gallery link via the send-link route, surfaced here at the upload
  // site so there's no need to navigate back to the person page.
  async function notifyPerson() {
    if (!person?.email) { setErr('This person has no email on file — add one on their page first.'); return }
    if (!(await confirm({
      title: 'Notify this person?',
      message: 'This emails them to let them know their photos are ready to view.',
      details: <><strong>{person.name || '—'}</strong>{person.email ? <> · {person.email}</> : null}</>,
      confirmLabel: 'Yes, notify',
    }))) return
    setNotifying(true); setNotifyResult(null)
    try {
      const res = await fetch(`/api/admin/photo-share-people/${personId}/send-link`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      setNotifyResult(res.ok ? { ok: true } : { error: data.error || 'Failed to send.' })
      if (res.ok) setTimeout(() => setNotifyResult(null), 3000)
    } catch {
      setNotifyResult({ error: 'Network error.' })
    } finally { setNotifying(false) }
  }

  async function handleFiles(e) {
    const all = Array.from(e.target.files || [])
    if (fileRef.current) fileRef.current.value = ''
    const files = all.filter(f => ALLOWED[f.type] || isHeicFile(f) || isTiffFile(f))
    const skipped = all.filter(f => !ALLOWED[f.type] && !isHeicFile(f) && !isTiffFile(f)).map(f => `${f.name} — unsupported format`)
    if (!all.length) return
    setUpload({ done: 0, total: files.length, errors: skipped, bytes: 0, ms: 0 })
    for (let i = 0; i < files.length; i++) {
      let file = files[i]
      try {
        file = await convertHeicIfNeeded(file)
        file = await convertTiffIfNeeded(file)
        if (!ALLOWED[file.type]) throw new Error('could not be converted — try exporting as JPEG first')
        if (file.size > 100 * 1024 * 1024) throw new Error('over the 100 MB per-file limit')
        const display = await compressImageClient(file)
        // Hashed so the server can spot "this exact photo is already
        // uploaded under this folder's title elsewhere" and skip the
        // storage upload entirely for a shared group shot — see
        // lib/photoShareDedup.js.
        const contentHash = await sha256Hex(file)
        const urlRes = await fetch(`/api/admin/photo-share-people/${personId}/folders/${folderId}/upload-url`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileType: file.type, dispFileType: display.type || 'image/jpeg', contentHash }),
        })
        const urls = await urlRes.json().catch(() => ({}))
        if (!urlRes.ok) throw new Error(urls.error || 'upload failed — please try again')

        let data
        if (urls.duplicate) {
          // Byte-identical photo already uploaded under a same-titled
          // folder elsewhere — link it in, nothing to upload.
          const res = await fetch(`/api/admin/photo-share-people/${personId}/folders/${folderId}/photos`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photoId: urls.photoId }),
          })
          data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data.error || 'upload failed — please try again')
        } else {
          const pairStarted = performance.now()
          await Promise.all([
            uploadToR2({ uploadUrl: urls.originalUploadUrl, file }),
            uploadToR2({ uploadUrl: urls.displayUploadUrl, file: display }),
          ])
          const pairMs = performance.now() - pairStarted
          setUpload(u => u ? { ...u, bytes: u.bytes + file.size + display.size, ms: u.ms + pairMs } : u)
          const res = await fetch(`/api/admin/photo-share-people/${personId}/folders/${folderId}/photos`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ originalPath: urls.originalPath, displayPath: urls.displayPath, contentHash }),
          })
          data = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(data.error || 'upload failed — please try again')
        }
        setPhotos(prev => [...prev, data])
      } catch (err) {
        setUpload(u => u ? { ...u, errors: [...u.errors, `${file.name} — ${err.message}`] } : u)
      }
      setUpload(u => u ? { ...u, done: i + 1 } : u)
    }
    setUpload(u => u && u.errors.length ? u : null)
  }

  async function handleSaveCaption(photoId, caption) {
    const res = await fetch(`/api/admin/photo-share-people/${personId}/folders/${folderId}/photos/${photoId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caption }),
    })
    if (!res.ok) { setErr('Failed to save caption.'); return }
    const data = await res.json().catch(() => ({}))
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, caption: data.caption ?? null } : p))
  }

  async function handleDeletePhoto(photoId) {
    try {
      const res = await fetch(`/api/admin/photo-share-people/${personId}/folders/${folderId}/photos/${photoId}`, { method: 'DELETE' })
      if (!res.ok) { setErr('Failed to delete photo.'); return }
      setPhotos(prev => prev.filter(p => p.id !== photoId))
      setSelected(prev => { const next = new Set(prev); next.delete(photoId); return next })
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

  function startEditExpiry() {
    setExpiryDraft(new Date(folder.expires_at).toISOString().slice(0, 10))
    setEditingExpiry(true)
  }

  async function saveExpiry() {
    if (!expiryDraft) return
    setSavingExpiry(true)
    try {
      // End-of-day in the folder's chosen date so the photos stay available
      // through the whole day the admin picked, not just until midnight UTC.
      const isoAtEndOfDay = new Date(`${expiryDraft}T23:59:59`).toISOString()
      const res = await fetch(`/api/admin/photo-share-people/${personId}/folders/${folderId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresAt: isoAtEndOfDay }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(data.error || 'Failed to update expiry.'); return }
      setFolder(f => ({ ...f, ...data })); setEditingExpiry(false)
    } catch { setErr('Network error.') }
    finally { setSavingExpiry(false) }
  }

  function toggleSelected(photoId) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(photoId)) next.delete(photoId)
      else next.add(photoId)
      return next
    })
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      const ids = Array.from(selected)
      for (const photoId of ids) {
        const res = await fetch(`/api/admin/photo-share-people/${personId}/folders/${folderId}/photos/${photoId}`, { method: 'DELETE' })
        if (res.ok) setPhotos(prev => prev.filter(p => p.id !== photoId))
      }
      setSelected(new Set())
    } catch { setErr('Network error — some photos may not have been deleted.') }
    finally { setBulkDeleting(false) }
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
        {/* Persistent page state, not a transient action error — stays inline
            rather than using <Err> (which is now a fire-once popup). */}
        <div style={{ fontSize: '12px', color: '#93333E', marginTop: '0.6rem', fontFamily: 'var(--font-inter),sans-serif' }}>{err || 'Not found.'}</div>
      </div>
    )
  }

  const left = daysLeft(folder.expires_at)
  const lightboxPhotos = photos.map(p => ({ id: p.id, url: p.url, originalUrl: p.originalUrl, caption: p.caption }))

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
        {!editingExpiry ? (
          <div style={{ fontSize: '11px', color: left <= 5 ? '#93333E' : '#999', marginTop: '0.4rem' }}>
            {left <= 0 ? 'Expired' : `${left} day${left !== 1 ? 's' : ''} left`} · removes on {fmtDate(folder.expires_at)}
            {' · '}<button type="button" onClick={startEditExpiry} style={{ background: 'none', border: 'none', color: '#8a7a5c', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px', fontFamily: 'var(--font-inter),sans-serif', padding: 0 }}>Change</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.5rem' }}>
            <input type="date" style={{ ...inp, width: 'auto' }} value={expiryDraft} onChange={e => setExpiryDraft(e.target.value)} />
            <PrimaryBtn onClick={saveExpiry} disabled={savingExpiry}>{savingExpiry ? 'Saving…' : 'Save'}</PrimaryBtn>
            <GhostBtn onClick={() => setEditingExpiry(false)}>Cancel</GhostBtn>
            <span style={{ fontSize: '10.5px', color: '#aaa', width: '100%' }}>Pick any date — sooner to remove it early, later to extend it.</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button type="button" onClick={copyLink} title={copied ? 'Copied!' : "Copy this person's link"}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.5rem 0.9rem', background: 'none', border: `0.5px solid ${copied ? '#3B6B2F' : 'rgba(0,0,0,0.2)'}`, borderRadius: '8px', cursor: 'pointer', color: copied ? '#3B6B2F' : '#555', fontFamily: 'var(--font-inter),sans-serif' }}>
          {copied ? 'Copied ✓' : 'Copy link'}
        </button>
        <GhostBtn small onClick={handleRenew} disabled={renewing}>{renewing ? 'Renewing…' : 'Renew 30 days'}</GhostBtn>
        <GhostBtn small onClick={notifyPerson} disabled={notifying || !!upload || !person?.email}>
          {notifying ? 'Sending…' : notifyResult?.ok ? '✓ Sent' : notifyResult?.error ? 'Retry' : `Notify ${person?.name?.split(' ')[0] || 'them'}`}
        </GhostBtn>
        {notifyResult?.error && <span style={{ fontSize: '11px', color: '#93333E' }}>{notifyResult.error}</span>}
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFiles} />
        <GhostBtn small onClick={() => fileRef.current?.click()} disabled={!!upload}>+ Add Photos</GhostBtn>
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

      {photos.length > 0 && (
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {selected.size === 0 ? (
            <span style={{ fontSize: '11px', color: '#aaa' }}>Tap a photo's corner to select it for bulk delete.</span>
          ) : (
            <>
              <span style={{ fontSize: '12px', color: '#555' }}>{selected.size} selected</span>
              <DangerBtn small onClick={handleBulkDelete} disabled={bulkDeleting}>{bulkDeleting ? 'Deleting…' : 'Delete Selected'}</DangerBtn>
              <GhostBtn small onClick={() => setSelected(new Set())}>Clear</GhostBtn>
            </>
          )}
        </div>
      )}

      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#bbb', fontSize: '13px', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px' }}>
          No photos yet — click "+ Add Photos" to upload.
        </div>
      ) : (
        <div className="shp-grid">
          {photos.map((photo, i) => {
            const isSelected = selected.has(photo.id)
            return (
              <div key={photo.id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', background: 'rgba(0,0,0,0.04)' }}>
                <button type="button" onClick={() => setLightboxIndex(i)}
                  style={{ position: 'absolute', inset: 0, border: 'none', padding: 0, cursor: 'pointer', display: 'block', width: '100%', height: '100%' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="" onError={onImgError(photo.originalUrl)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
                <button type="button" onClick={() => toggleSelected(photo.id)} aria-label={isSelected ? 'Deselect photo' : 'Select photo'}
                  style={{ position: 'absolute', top: '6px', right: '6px', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: isSelected ? '#45643C' : 'rgba(0,0,0,0.35)', border: '1.5px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                  {isSelected && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                </button>
                {/* Download original — matches the member gallery tile */}
                <span role="button" aria-label="Download original"
                  onClick={() => { const a = document.createElement('a'); a.href = `${photo.originalUrl || photo.url}?download`; a.rel = 'noreferrer'; a.click() }}
                  style={{ position: 'absolute', bottom: '6px', right: '6px', width: '26px', height: '26px', borderRadius: '99px', background: 'rgba(15,30,20,0.65)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                </span>
                {/* Same photo also linked into someone else's folder — never
                    a silent black box about where a shared photo lives. */}
                {photo.sharedWith?.length > 0 && (
                  <span title={`Also in: ${photo.sharedWith.map(s => s.personName).join(', ')}`}
                    style={{ position: 'absolute', top: '6px', left: '6px', display: 'flex', alignItems: 'center', gap: '3px', padding: '3px 7px', borderRadius: '99px', background: 'rgba(15,30,20,0.72)', color: '#c5a882', fontSize: '10px', fontWeight: '600', cursor: 'default' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    {photo.sharedWith.length}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      <AdminPhotoLightbox photos={lightboxPhotos} openIndex={lightboxIndex} onNavigate={setLightboxIndex} onClose={() => setLightboxIndex(null)} onDelete={handleDeletePhoto} onSaveCaption={handleSaveCaption} />

      <div style={{ fontSize: '11px', color: '#bbb', marginTop: '0.75rem' }}>Tip: tap a photo to view it full-size and add a caption — captions show on their gallery.</div>
    </div>
  )
}
