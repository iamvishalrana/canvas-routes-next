'use client'
import { useState, useRef } from 'react'
import { uploadToSupabaseStorage } from '../lib/uploadToSupabaseStorage'
import { convertHeicIfNeeded, isHeicFile } from '../lib/convertHeicIfNeeded'
import { compressImageClient } from '../lib/compressImageClient'
import { MIME_TO_EXT } from '../lib/allowedImageTypes'
import { membersPhotosT } from '../lib/i18n/membersPhotos'

const ALLOWED = MIME_TO_EXT
const MAX_FILES = 20

// Fields were previously oversized (0.88rem padding) for what's a compact
// portal widget — trimmed down so this doesn't dominate the Event Photos
// column, especially on mobile where every extra inch of scroll matters.
const inp = {
  width: '100%', padding: '0.65rem 0.8rem', boxSizing: 'border-box',
  border: '0.5px solid rgba(0,0,0,0.16)', background: '#fff',
  fontSize: '16px', fontFamily: 'var(--font-inter), sans-serif',
  color: '#1a1a1a', outline: 'none', cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none',
}

// Lets a member upload photos they have from an event they attended. Nothing
// uploaded here shows up anywhere (including back to this member) until an
// admin publishes it from /admin/photos/submissions — see
// app/api/member/gallery-submission/*/route.js and
// supabase/migrations/20260810_gallery_photo_submissions.sql.
export default function MemberPhotoUpload({ attendedEventNames, lang = 'en' }) {
  const [open, setOpen] = useState(false)
  const [album, setAlbum] = useState(attendedEventNames[0] || '')
  const [caption, setCaption] = useState('')
  const [upload, setUpload] = useState(null) // { done, total, errors: [] }
  const [done, setDone] = useState(null) // { count, album } after a batch finishes
  const filesRef = useRef(null)
  const t = membersPhotosT[lang]

  if (!attendedEventNames.length) return null

  async function handleFiles(e) {
    const rawAll = Array.from(e.target.files || [])
    const all = rawAll.slice(0, MAX_FILES)
    const files = all.filter(f => ALLOWED[f.type] || isHeicFile(f))
    const skipped = all.filter(f => !ALLOWED[f.type] && !isHeicFile(f)).map(f => `${f.name} — ${t.unsupportedFormat}`)
    const truncated = rawAll.length - all.length
    if (truncated > 0) skipped.push(t.photosSkipped(truncated, truncated === 1 ? '' : 's', MAX_FILES))
    if (!rawAll.length) return
    setDone(null)
    setUpload({ done: 0, total: files.length, errors: skipped })
    let succeeded = 0
    for (let i = 0; i < files.length; i++) {
      let file = files[i]
      try {
        file = await convertHeicIfNeeded(file)
        if (!ALLOWED[file.type]) throw new Error(t.couldNotConvert)
        if (file.size > 100 * 1024 * 1024) throw new Error(t.overSizeLimit)
        const display = await compressImageClient(file)
        const urlRes = await fetch('/api/member/gallery-submission/upload-url', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ album, origExt: ALLOWED[file.type], dispExt: ALLOWED[display.type] || 'jpg' }),
        })
        const urls = await urlRes.json().catch(() => ({}))
        if (!urlRes.ok) throw new Error(urls.error || t.uploadFailedRetry)
        await Promise.all([
          uploadToSupabaseStorage({ bucket: 'gallery-photos', path: urls.originalPath, token: urls.originalToken, file }),
          uploadToSupabaseStorage({ bucket: 'gallery-photos', path: urls.displayPath, token: urls.displayToken, file: display }),
        ])
        const res = await fetch('/api/member/gallery-submission', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ album, caption, originalPath: urls.originalPath, displayPath: urls.displayPath }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || t.uploadFailedRetry)
        succeeded += 1
      } catch (err) {
        setUpload(u => u ? { ...u, errors: [...u.errors, `${file.name} — ${err.message}`] } : u)
      }
      setUpload(u => u ? { ...u, done: i + 1 } : u)
    }
    if (succeeded > 0) {
      fetch('/api/member/gallery-submission/finish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album, count: succeeded }),
      }).catch(() => {})
      setDone({ count: succeeded, album })
      setCaption('')
    }
    // Keep the errors visible if any files failed/were skipped — clearing
    // unconditionally here wiped them before the member could ever read why.
    setUpload(u => (u && u.errors.length > 0) ? { ...u, finished: true } : null)
    if (filesRef.current) filesRef.current.value = ''
  }

  const uploadLocked = !!upload && !upload.finished

  return (
    <div className="mpu-card" style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '2px', padding: '1.1rem 1.25rem', marginBottom: '2rem' }}>
      <style>{`
        @keyframes mpu-fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mpu-icon-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(69,100,60,0.22); } 50% { box-shadow: 0 0 0 6px rgba(69,100,60,0); } }
        @keyframes mpu-pop-in { 0% { opacity: 0; transform: scale(0.9); } 60% { opacity: 1; transform: scale(1.03); } 100% { transform: scale(1); } }
        .mpu-card { animation: mpu-fade-in 0.55s cubic-bezier(0.23,1,0.32,1) both; }
        .mpu-toggle { transition: transform 0.15s ease; }
        .mpu-toggle:active { transform: scale(0.985); }
        .mpu-icon { animation: mpu-icon-pulse 2.6s ease-in-out infinite; }
        .mpu-form { animation: mpu-fade-in 0.4s cubic-bezier(0.23,1,0.32,1) both; }
        .mpu-progress-fill { transition: width 0.3s ease; }
        .mpu-error { animation: mpu-fade-in 0.35s ease both; }
        .mpu-done { animation: mpu-pop-in 0.4s cubic-bezier(0.23,1,0.32,1) both; }
        .mpu-dropzone { transition: border-color 0.15s ease, background 0.15s ease; }
        @media (hover: hover) { .mpu-dropzone:hover { border-color: rgba(69,100,60,0.55); background: rgba(69,100,60,0.05); } }
        .mpu-dropzone:active { transform: scale(0.99); }
        @keyframes mpu-check-draw { to { stroke-dashoffset: 0; } }
        .mpu-check-draw polyline { stroke-dasharray: 20; stroke-dashoffset: 20; animation: mpu-check-draw 0.4s cubic-bezier(0.4,0,0.2,1) 0.15s forwards; }
        @media (prefers-reduced-motion: reduce) {
          .mpu-card, .mpu-form, .mpu-error, .mpu-done { animation: none !important; opacity: 1 !important; }
          .mpu-icon { animation: none !important; }
          .mpu-check-draw polyline { animation: none !important; stroke-dashoffset: 0 !important; }
        }
      `}</style>
      {!open ? (
        <button type="button" className="mpu-toggle" onClick={() => setOpen(true)}
          style={{ background: 'rgba(69,100,60,0.05)', border: '1px dashed rgba(69,100,60,0.45)', borderRadius: '8px', padding: '0.85rem 1rem', minHeight: '52px', width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.55rem', fontFamily: 'var(--font-inter), sans-serif', WebkitTapHighlightColor: 'transparent' }}>
          <span className="mpu-icon" style={{ width: '30px', height: '30px', borderRadius: '99px', background: 'rgba(69,100,60,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#45643C" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </span>
          <span style={{ fontSize: '13.5px', fontWeight: '500', color: '#45643C', letterSpacing: '0.01em' }}>{t.addPhotosCta}</span>
        </button>
      ) : (
        <div className="mpu-form" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ fontSize: '12.5px', color: '#1a1a1a', marginBottom: '0.15rem', lineHeight: 1.6 }}>
            {t.shareDescriptionEvent}
          </div>

          {/* Step 1 — which event this batch belongs to */}
          <div style={{ position: 'relative' }}>
            <select value={album} onChange={e => setAlbum(e.target.value)} style={inp}>
              {attendedEventNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>

          {/* Step 2 — a real tap target instead of the tiny native file-input
              chrome, which read as an afterthought and wrapped confusingly
              next to the select on narrow screens. */}
          <label htmlFor="mpu-file-input" className="mpu-dropzone"
            style={{
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              border: '1px dashed rgba(69,100,60,0.4)', borderRadius: '4px',
              background: 'rgba(69,100,60,0.03)', padding: '0.75rem 1rem', minHeight: '44px',
              boxSizing: 'border-box', cursor: uploadLocked ? 'not-allowed' : 'pointer',
              opacity: uploadLocked ? 0.55 : 1, WebkitTapHighlightColor: 'transparent',
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#45643C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span style={{ fontSize: '12.5px', color: '#45643C', letterSpacing: '0.02em', fontFamily: 'var(--font-inter), sans-serif' }}>{t.choosePhotos}</span>
            <input id="mpu-file-input" ref={filesRef} type="file" accept="image/*,.heic,.heif" multiple onChange={handleFiles}
              disabled={uploadLocked} style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }} />
          </label>

          {/* Step 3 — optional caption */}
          <input value={caption} onChange={e => setCaption(e.target.value)} disabled={uploadLocked} maxLength={300}
            placeholder={t.captionPlaceholder} enterKeyHint="done"
            style={{ ...inp, cursor: 'text' }} />
          <div style={{ fontSize: '10.5px', color: '#bbb' }}>{t.upToPhotos(MAX_FILES)}</div>

          {upload && (
            <div className="mpu-form" style={{ marginTop: '0.85rem' }}>
              <div style={{ fontSize: '12px', color: '#555' }}>
                {upload.finished ? t.couldntUpload(upload.errors.length, upload.total || upload.errors.length) : t.uploading(upload.done, upload.total)}
              </div>
              {!upload.finished && (
                <div style={{ height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '99px', marginTop: '0.4rem', overflow: 'hidden' }}>
                  <div className="mpu-progress-fill" style={{ height: '100%', width: `${upload.total ? (upload.done / upload.total) * 100 : 100}%`, background: '#45643C', borderRadius: '99px' }} />
                </div>
              )}
              {upload.errors.map((e, i) => <div key={i} className="mpu-error" style={{ fontSize: '11px', color: '#93333E', marginTop: '0.4rem' }}>{e}</div>)}
            </div>
          )}

          {done && (
            <div className="mpu-done" style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <svg className="mpu-check-draw" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#45643C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                <circle cx="12" cy="12" r="10" opacity="0.15" fill="#45643C" stroke="none" />
                <polyline points="8 12.5 10.5 15 16 9" />
              </svg>
              <div style={{ fontSize: '12px', color: '#45643C', lineHeight: 1.6 }}>
                {t.thanksSubmitted(done.count, done.count === 1 ? '' : 's', done.album)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
