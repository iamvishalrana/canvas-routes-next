'use client'
import { useState, useRef } from 'react'
import SectionCard from './WtetSectionCard'
import { CHECKIN_T } from '../lib/genericCheckinContent'
import { useLanguage } from '../lib/i18n/LanguageContext'

// Downscales + re-encodes before upload — same approach as the admin photo
// gallery (app/admin/photos/PhotosClient.jsx) since Vercel's function body
// limit makes this load-bearing for anything shot on a modern phone camera.
// Falls back to the original file on any failure.
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

// identifier: { email, eventId }
export default function CheckinCarPhotoSection({ identifier, carPhoto, onSaved }) {
  const { lang } = useLanguage()
  const t = CHECKIN_T[lang]
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  function pickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setError(null)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (!file) { setError(t.carPhotoErrMissing); return }
    setSubmitting(true)
    try {
      const compressed = await compressImage(file)
      const body = new FormData()
      body.append('email', identifier.email)
      body.append('photo', compressed)
      const res = await fetch(`/api/checkin/${identifier.eventId}/car-photo`, { method: 'POST', body })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || t.genericError); return }
      onSaved(d.carPhoto)
    } catch {
      setError(t.networkError)
    } finally {
      setSubmitting(false)
    }
  }

  if (carPhoto) {
    return (
      <SectionCard title={t.carPhotoTitle} done delay={270} doneLabel={t.carPhotoDoneLabel} pendingLabel={t.carPhotoPendingLabel}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={carPhoto.url} alt="" style={{ width: '110px', height: '110px', objectFit: 'cover', border: '0.5px solid rgba(0,0,0,0.1)' }} />
          <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.8 }}>{t.carPhotoThanks}</div>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title={t.carPhotoTitle} done={false} delay={270} doneLabel={t.carPhotoDoneLabel} pendingLabel={t.carPhotoPendingLabel}>
      <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.8, margin: '0 0 1.25rem' }}>{t.carPhotoIntro}</p>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
        <input ref={inputRef} type="file" accept="image/*" onChange={pickFile} style={{ display: 'none' }} />
        {preview ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" style={{ width: '110px', height: '110px', objectFit: 'cover', border: '0.5px solid rgba(0,0,0,0.1)' }} />
            <button type="button" onClick={() => inputRef.current?.click()} className="wtetci-btn-ghost" style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.18)', padding: '0.5rem 1.1rem', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', cursor: 'pointer' }}>
              {t.carPhotoChooseDifferent}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} className="wtetci-btn-ghost" style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.18)', padding: '0.85rem 1.5rem', fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1a1a1a', cursor: 'pointer' }}>
            {t.carPhotoChooseBtn}
          </button>
        )}

        {error && <div className="wtetci-fade-in" style={{ fontSize: '13px', color: '#93333E', padding: '0.7rem 0.9rem', background: 'rgba(147,51,62,0.05)', border: '0.5px solid rgba(147,51,62,0.2)' }}>{error}</div>}

        <button type="submit" disabled={submitting || !file} className="wtetci-btn-primary" style={{ padding: '0.85rem 1.75rem', background: '#0F1E14', color: '#F5F1EC', border: 'none', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: (submitting || !file) ? 'not-allowed' : 'pointer', opacity: (submitting || !file) ? 0.5 : 1 }}>
          {submitting ? t.carPhotoSendingBtn : t.carPhotoSendBtn}
        </button>
      </form>
    </SectionCard>
  )
}
