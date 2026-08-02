'use client'
import { useState, useRef } from 'react'
import { uploadToSupabaseStorage } from '../lib/uploadToSupabaseStorage'
import { convertHeicIfNeeded, isHeicFile } from '../lib/convertHeicIfNeeded'
import { compressImageClient } from '../lib/compressImageClient'
import { MIME_TO_EXT } from '../lib/allowedImageTypes'

const ALLOWED = MIME_TO_EXT
const MAX_FILES = 20

const inp = {
  width: '100%', padding: '0.88rem 1rem', boxSizing: 'border-box',
  border: '0.5px solid rgba(0,0,0,0.16)', background: '#fff',
  fontSize: '16px', fontFamily: 'var(--font-inter), sans-serif',
  color: '#1a1a1a', outline: 'none', cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none',
}

// Lets a member upload photos they have from an event they attended. Nothing
// uploaded here shows up anywhere (including back to this member) until an
// admin publishes it from /admin/photos/submissions — see
// app/api/member/gallery-submission/*/route.js and
// supabase/migrations/20260810_gallery_photo_submissions.sql.
export default function MemberPhotoUpload({ attendedEventNames }) {
  const [open, setOpen] = useState(false)
  const [album, setAlbum] = useState(attendedEventNames[0] || '')
  const [upload, setUpload] = useState(null) // { done, total, errors: [] }
  const [done, setDone] = useState(null) // { count, album } after a batch finishes
  const filesRef = useRef(null)

  if (!attendedEventNames.length) return null

  async function handleFiles(e) {
    const all = Array.from(e.target.files || []).slice(0, MAX_FILES)
    const files = all.filter(f => ALLOWED[f.type] || isHeicFile(f))
    const skipped = all.filter(f => !ALLOWED[f.type] && !isHeicFile(f)).map(f => `${f.name} — unsupported format`)
    if (!all.length) return
    setDone(null)
    setUpload({ done: 0, total: files.length, errors: skipped })
    let succeeded = 0
    for (let i = 0; i < files.length; i++) {
      let file = files[i]
      try {
        file = await convertHeicIfNeeded(file)
        if (!ALLOWED[file.type]) throw new Error('could not be converted — try exporting as JPEG first')
        if (file.size > 40 * 1024 * 1024) throw new Error('over the 40 MB per-file limit')
        const display = await compressImageClient(file)
        const urlRes = await fetch('/api/member/gallery-submission/upload-url', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ album, origExt: ALLOWED[file.type], dispExt: ALLOWED[display.type] || 'jpg' }),
        })
        const urls = await urlRes.json().catch(() => ({}))
        if (!urlRes.ok) throw new Error(urls.error || `HTTP ${urlRes.status}`)
        await Promise.all([
          uploadToSupabaseStorage({ bucket: 'gallery-photos', path: urls.originalPath, token: urls.originalToken, file }),
          uploadToSupabaseStorage({ bucket: 'gallery-photos', path: urls.displayPath, token: urls.displayToken, file: display }),
        ])
        const res = await fetch('/api/member/gallery-submission', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ album, originalPath: urls.originalPath, displayPath: urls.displayPath }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
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
    }
    setUpload(null)
    if (filesRef.current) filesRef.current.value = ''
  }

  return (
    <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '2px', padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          style={{ background: 'none', border: 'none', padding: '0.5rem 0', margin: '-0.5rem 0', minHeight: '44px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', fontFamily: 'var(--font-inter), sans-serif', WebkitTapHighlightColor: 'transparent' }}>
          <span style={{ width: '30px', height: '30px', borderRadius: '99px', background: 'rgba(69,100,60,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#45643C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </span>
          <span style={{ fontSize: '13px', color: '#1a1a1a' }}>Have photos from an event? Share them here.</span>
        </button>
      ) : (
        <div>
          <div style={{ fontSize: '13px', color: '#1a1a1a', marginBottom: '0.75rem' }}>
            Share photos you have from an event — we'll add them to the album once reviewed.
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
              <select value={album} onChange={e => setAlbum(e.target.value)} style={inp}>
                {attendedEventNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <input ref={filesRef} type="file" accept="image/*,.heic,.heif" multiple onChange={handleFiles}
              disabled={!!upload} style={{ flex: '1 1 200px', fontSize: '12px', fontFamily: 'var(--font-inter), sans-serif' }} />
          </div>
          <div style={{ fontSize: '10.5px', color: '#bbb', marginTop: '0.6rem' }}>Up to {MAX_FILES} photos, 40MB each.</div>

          {upload && (
            <div style={{ marginTop: '0.85rem' }}>
              <div style={{ fontSize: '12px', color: '#555' }}>Uploading {upload.done} / {upload.total}…</div>
              <div style={{ height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '99px', marginTop: '0.4rem', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${upload.total ? (upload.done / upload.total) * 100 : 100}%`, background: '#45643C', borderRadius: '99px', transition: 'width 0.3s ease' }} />
              </div>
              {upload.errors.map((e, i) => <div key={i} style={{ fontSize: '11px', color: '#93333E', marginTop: '0.4rem' }}>{e}</div>)}
            </div>
          )}

          {done && (
            <div style={{ marginTop: '0.85rem', fontSize: '12px', color: '#45643C' }}>
              Thanks — {done.count} photo{done.count === 1 ? '' : 's'} submitted for review. We'll add them to {done.album} once approved.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
