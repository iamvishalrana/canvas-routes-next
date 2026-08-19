'use client'
import { useState, useRef } from 'react'
import { uploadToSupabaseStorage } from '../lib/uploadToSupabaseStorage'
import { convertHeicIfNeeded, isHeicFile } from '../lib/convertHeicIfNeeded'
import { compressImageClient } from '../lib/compressImageClient'
import { MIME_TO_EXT } from '../lib/allowedImageTypes'

const ALLOWED = MIME_TO_EXT
const MAX_FILES = 20

// Lets a non-member upload photos they have from this specific folder's
// event — rendered once per folder in GalleryPasswordGate's authed view.
// Nothing uploaded here shows up anywhere (including back to this visitor)
// until an admin publishes it from /admin/photos/submissions — see
// app/api/gallery/[token]/submit-*/route.js.
export default function NonMemberPhotoUpload({ token, sessionId, folderId, folderTitle, entranceDelay = 0 }) {
  const [open, setOpen] = useState(false)
  const [caption, setCaption] = useState('')
  const [upload, setUpload] = useState(null)
  const [done, setDone] = useState(null)
  const filesRef = useRef(null)

  async function handleFiles(e) {
    const rawAll = Array.from(e.target.files || [])
    const all = rawAll.slice(0, MAX_FILES)
    const files = all.filter(f => ALLOWED[f.type] || isHeicFile(f))
    const skipped = all.filter(f => !ALLOWED[f.type] && !isHeicFile(f)).map(f => `${f.name} — unsupported format`)
    const truncated = rawAll.length - all.length
    if (truncated > 0) skipped.push(`${truncated} more photo${truncated === 1 ? '' : 's'} skipped — up to ${MAX_FILES} per upload`)
    if (!rawAll.length) return
    setDone(null)
    setUpload({ done: 0, total: files.length, errors: skipped })
    let succeeded = 0
    for (let i = 0; i < files.length; i++) {
      let file = files[i]
      try {
        file = await convertHeicIfNeeded(file)
        if (!ALLOWED[file.type]) throw new Error('could not be converted — try exporting as JPEG first')
        if (file.size > 100 * 1024 * 1024) throw new Error('over the 100 MB per-file limit')
        const display = await compressImageClient(file)
        const urlRes = await fetch(`/api/gallery/${token}/submit-upload-url`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, folderId, origExt: ALLOWED[file.type], dispExt: ALLOWED[display.type] || 'jpg' }),
        })
        const urls = await urlRes.json().catch(() => ({}))
        if (!urlRes.ok) throw new Error(urls.error || 'upload failed — please try again')
        await Promise.all([
          uploadToSupabaseStorage({ bucket: 'photo-shares', path: urls.originalPath, token: urls.originalToken, file }),
          uploadToSupabaseStorage({ bucket: 'photo-shares', path: urls.displayPath, token: urls.displayToken, file: display }),
        ])
        const res = await fetch(`/api/gallery/${token}/submit-photo`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, folderId, caption, originalPath: urls.originalPath, displayPath: urls.displayPath }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'upload failed — please try again')
        succeeded += 1
      } catch (err) {
        setUpload(u => u ? { ...u, errors: [...u.errors, `${file.name} — ${err.message}`] } : u)
      }
      setUpload(u => u ? { ...u, done: i + 1 } : u)
    }
    if (succeeded > 0) {
      fetch(`/api/gallery/${token}/submit-finish`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, folderId, count: succeeded }),
      }).catch(() => {})
      setDone({ count: succeeded })
      setCaption('')
    }
    // Keep errors visible if any files failed/were skipped — clearing
    // unconditionally here wiped them before the visitor could ever read why.
    setUpload(u => (u && u.errors.length > 0) ? { ...u, finished: true } : null)
    if (filesRef.current) filesRef.current.value = ''
  }

  const uploadLocked = !!upload && !upload.finished

  return (
    <div className="nmp-card" style={{ marginTop: '1rem', marginBottom: '2rem', padding: '1rem 1.1rem', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', fontFamily: 'var(--font-inter), sans-serif', animationDelay: `${entranceDelay}ms` }}>
      <style>{`
        @keyframes nmp-fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes nmp-icon-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(69,100,60,0.22); } 50% { box-shadow: 0 0 0 6px rgba(69,100,60,0); } }
        .nmp-card { animation: nmp-fade-in 0.5s cubic-bezier(0.23,1,0.32,1) both; }
        .nmp-toggle { transition: transform 0.15s ease; }
        .nmp-toggle:active { transform: scale(0.985); }
        .nmp-icon { animation: nmp-icon-pulse 2.6s ease-in-out infinite; }
        .nmp-form { animation: nmp-fade-in 0.4s cubic-bezier(0.23,1,0.32,1) both; }
        .nmp-error, .nmp-done { animation: nmp-fade-in 0.35s ease both; }
        .nmp-dropzone { transition: border-color 0.15s ease, background 0.15s ease; }
        @media (hover: hover) { .nmp-dropzone:hover { border-color: rgba(69,100,60,0.55); background: rgba(69,100,60,0.05); } }
        .nmp-dropzone:active { transform: scale(0.99); }
      `}</style>
      {!open ? (
        <button type="button" className="nmp-toggle" onClick={() => setOpen(true)}
          style={{ background: 'rgba(69,100,60,0.05)', border: '1px dashed rgba(69,100,60,0.45)', borderRadius: '8px', padding: '0.8rem 1rem', minHeight: '52px', width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.55rem', fontFamily: 'var(--font-inter), sans-serif', WebkitTapHighlightColor: 'transparent' }}>
          <span className="nmp-icon" style={{ width: '28px', height: '28px', borderRadius: '99px', background: 'rgba(69,100,60,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#45643C" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </span>
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#45643C', letterSpacing: '0.01em' }}>Add your photos from {folderTitle}</span>
        </button>
      ) : (
        <div className="nmp-form" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ fontSize: '12.5px', color: '#1a1a1a', lineHeight: 1.6 }}>
            We'll add your photos to this gallery once reviewed.
          </div>

          {/* Clear tap target instead of the bare native file input */}
          <label htmlFor={`nmp-file-${folderId}`} className="nmp-dropzone"
            style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: '1px dashed rgba(69,100,60,0.4)', borderRadius: '4px', background: 'rgba(69,100,60,0.03)', padding: '0.75rem 1rem', minHeight: '44px', boxSizing: 'border-box', cursor: uploadLocked ? 'not-allowed' : 'pointer', opacity: uploadLocked ? 0.55 : 1, WebkitTapHighlightColor: 'transparent' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#45643C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span style={{ fontSize: '12.5px', color: '#45643C', letterSpacing: '0.02em' }}>Choose photos</span>
            <input id={`nmp-file-${folderId}`} ref={filesRef} type="file" accept="image/*,.heic,.heif" multiple onChange={handleFiles}
              disabled={uploadLocked} style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }} />
          </label>

          <input value={caption} onChange={e => setCaption(e.target.value)} disabled={uploadLocked} maxLength={300}
            placeholder="Caption (optional) — applies to all photos in this upload" enterKeyHint="done"
            style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem 0.85rem', border: '0.5px solid rgba(0,0,0,0.16)', background: '#fff', fontSize: '16px', fontFamily: 'var(--font-inter), sans-serif', color: '#1a1a1a', outline: 'none' }} />
          <div style={{ fontSize: '10px', color: '#bbb' }}>Up to {MAX_FILES} photos per upload.</div>

          {upload && (
            <div className="nmp-form" style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '11.5px', color: '#555' }}>
                {upload.finished ? `${upload.errors.length} of ${upload.total || upload.errors.length} couldn't be uploaded:` : `Uploading ${upload.done} / ${upload.total}…`}
              </div>
              {!upload.finished && (
              <div style={{ height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '99px', marginTop: '0.4rem', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${upload.total ? (upload.done / upload.total) * 100 : 100}%`, background: '#45643C', borderRadius: '99px', transition: 'width 0.3s ease' }} />
              </div>
              )}
              {upload.errors.map((e, i) => <div key={i} className="nmp-error" style={{ fontSize: '10.5px', color: '#93333E', marginTop: '0.35rem' }}>{e}</div>)}
            </div>
          )}

          {done && (
            <div className="nmp-done" style={{ marginTop: '0.75rem', fontSize: '11.5px', color: '#45643C' }}>
              Thanks — {done.count} photo{done.count === 1 ? '' : 's'} submitted for review.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
