'use client'
import { useEffect, useCallback, useRef, useState } from 'react'

// Fullscreen click-to-browse viewer for admin photo grids (Event Photos,
// Car & Personal, Non-Member Shares) — the grids themselves only ever showed
// thumbnails with a delete overlay, no way to see a photo full-size or step
// through the set. Index is owned by the parent (openIndex/onNavigate) so
// deleting a photo can shrink the array without the lightbox losing sync.
//
// photos: [{ id, url, originalUrl, caption? }]
// onSaveCaption?(id, caption): when provided, the caption becomes editable
// inline (used for non-member shares). Omitted → caption is read-only.
export default function AdminPhotoLightbox({ photos, openIndex, onNavigate, onClose, onDelete, onSaveCaption }) {
  const touchStartX = useRef(null)
  const open = openIndex != null && photos[openIndex]
  const [captionDraft, setCaptionDraft] = useState('')
  const [savingCaption, setSavingCaption] = useState(false)

  // Re-seed the editable caption whenever the open photo changes.
  useEffect(() => {
    if (open) { setCaptionDraft(photos[openIndex]?.caption || ''); setSavingCaption(false) }
  }, [openIndex, open]) // eslint-disable-line react-hooks/exhaustive-deps

  const step = useCallback(dir => {
    if (!photos.length) return
    onNavigate((openIndex + dir + photos.length) % photos.length)
  }, [openIndex, photos.length, onNavigate])

  // A delete can shrink the array out from under the current index —
  // clamp back into range (or close entirely if nothing's left).
  useEffect(() => {
    if (openIndex == null) return
    if (photos.length === 0) { onClose(); return }
    if (openIndex >= photos.length) onNavigate(photos.length - 1)
  }, [photos.length, openIndex, onClose, onNavigate])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      // Don't hijack arrows/Escape while the caption field is focused — they'd
      // otherwise step through photos (losing the edit) instead of moving the
      // cursor. Escape blurs the field first, then closes on a second press.
      const typing = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'
      if (e.key === 'Escape') { if (typing) e.target.blur(); else onClose() }
      else if (typing) return
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
    }
  }, [open, onClose, step])

  if (!open) return null
  const photo = photos[openIndex]

  return (
    <div
      role="dialog" aria-modal="true"
      onClick={onClose}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (touchStartX.current === null) return
        const dx = e.changedTouches[0].clientX - touchStartX.current
        touchStartX.current = null
        if (Math.abs(dx) > 45) step(dx > 0 ? -1 : 1)
      }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(10,16,12,0.96)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 'calc(1rem + env(safe-area-inset-top)) 1rem calc(1.5rem + env(safe-area-inset-bottom))',
      }}>
      <button type="button" onClick={onClose} aria-label="Close"
        style={{
          position: 'absolute', top: 'calc(0.75rem + env(safe-area-inset-top))', right: '0.9rem',
          background: 'none', border: 'none', cursor: 'pointer', zIndex: 2,
          color: 'rgba(245,241,236,0.7)', fontSize: '26px', lineHeight: 1, padding: '0.6rem',
          fontFamily: 'var(--font-inter), sans-serif', WebkitTapHighlightColor: 'transparent',
        }}>
        ×
      </button>

      {photos.length > 1 && (
        <>
          <button type="button" onClick={e => { e.stopPropagation(); step(-1) }} aria-label="Previous photo"
            style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 'max(0.25rem, env(safe-area-inset-left))', zIndex: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,241,236,0.55)', padding: '1rem', fontSize: '28px', lineHeight: 1, fontFamily: 'var(--font-inter), sans-serif' }}>‹</button>
          <button type="button" onClick={e => { e.stopPropagation(); step(1) }} aria-label="Next photo"
            style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: 'max(0.25rem, env(safe-area-inset-right))', zIndex: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,241,236,0.55)', padding: '1rem', fontSize: '28px', lineHeight: 1, fontFamily: 'var(--font-inter), sans-serif' }}>›</button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt={photo.caption || ''} onClick={e => e.stopPropagation()}
        style={{ maxWidth: 'min(92vw, 1100px)', maxHeight: '76vh', objectFit: 'contain', display: 'block' }} />

      <div onClick={e => e.stopPropagation()} style={{ textAlign: 'center', marginTop: '1.1rem', maxWidth: '85vw', fontFamily: 'var(--font-inter), sans-serif' }}>
        {onSaveCaption ? (
          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '0.7rem' }}>
            <input value={captionDraft} onChange={e => setCaptionDraft(e.target.value)} placeholder="Add a caption…" maxLength={300}
              style={{ width: 'min(70vw, 360px)', padding: '0.5rem 0.75rem', fontSize: '16px', fontFamily: 'var(--font-inter), sans-serif', color: '#F5F1EC', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(197,168,130,0.4)', borderRadius: '8px', outline: 'none' }} />
            {captionDraft.trim() !== (photo.caption || '') && (
              <button type="button" disabled={savingCaption}
                onClick={async () => { setSavingCaption(true); try { await onSaveCaption(photo.id, captionDraft.trim()) } finally { setSavingCaption(false) } }}
                style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0F1E14', background: '#F5F1EC', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: savingCaption ? 'default' : 'pointer', fontFamily: 'var(--font-inter), sans-serif' }}>
                {savingCaption ? 'Saving…' : 'Save'}
              </button>
            )}
          </div>
        ) : photo.caption && (
          <div style={{ fontSize: '13px', color: 'rgba(245,241,236,0.85)', lineHeight: 1.6, marginBottom: '0.6rem' }}>{photo.caption}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)' }}>
            {openIndex + 1} / {photos.length}
          </div>
          <a href={photo.originalUrl || photo.url} target="_blank" rel="noopener noreferrer" download
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#F5F1EC', textDecoration: 'none', border: '0.5px solid rgba(197,168,130,0.5)', padding: '0.45rem 1rem' }}>
            Download
          </a>
          {onDelete && (
            <button type="button" onClick={() => onDelete(photo.id)}
              style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#e5a1a8', background: 'none', border: '0.5px solid rgba(147,51,62,0.5)', padding: '0.45rem 1rem', cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif' }}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
