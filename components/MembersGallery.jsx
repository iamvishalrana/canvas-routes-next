'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import FadeUp from './FadeUp'

function formatDate(d) {
  if (!d) return null
  return new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function downloadName(album, idx, url) {
  const slug = album.replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'canvas-routes'
  const ext = (url.split('?')[0].split('.').pop() || 'jpg').toLowerCase()
  return `${slug}-${idx + 1}.${ext}`
}

export default function MembersGallery({ albums }) {
  // lightbox: { albumIdx, photoIdx } or null
  const [lightbox, setLightbox] = useState(null)
  const touchStartX = useRef(null)

  const close = useCallback(() => setLightbox(null), [])
  const step = useCallback(dir => {
    setLightbox(lb => {
      if (!lb) return lb
      const count = albums[lb.albumIdx].photos.length
      return { ...lb, photoIdx: (lb.photoIdx + dir + count) % count }
    })
  }, [albums])

  useEffect(() => {
    if (!lightbox) return
    function onKey(e) {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    // Lock background scroll while the lightbox is open (html + body — iOS
    // Safari ignores overflow on body alone)
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
    }
  }, [lightbox, close, step])

  const current = lightbox ? albums[lightbox.albumIdx] : null
  const currentPhoto = current ? current.photos[lightbox.photoIdx] : null

  return (
    <div>
      <style>{`
        .mg-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 0.6rem;
        }
        @media (max-width: 640px) {
          .mg-grid { grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
        }
        .mg-tile {
          position: relative;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          background: rgba(0,0,0,0.05);
          border: none;
          padding: 0;
          cursor: pointer;
          display: block;
          width: 100%;
        }
        .mg-tile img {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
          transition: transform 0.45s cubic-bezier(0.23, 1, 0.32, 1);
        }
        @media (hover: hover) {
          .mg-tile:hover img { transform: scale(1.04); }
        }
        .mg-lb-nav {
          position: absolute; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: rgba(245,241,236,0.55); padding: 1rem;
          font-size: 28px; line-height: 1; font-family: var(--font-inter), sans-serif;
          -webkit-tap-highlight-color: transparent;
          transition: color 0.15s;
        }
        @media (hover: hover) { .mg-lb-nav:hover { color: #F5F1EC; } }
        @media (max-width: 640px) { .mg-lb-nav { padding: 0.75rem 0.5rem; font-size: 24px; } }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
        {albums.map((album, ai) => (
          <FadeUp key={album.name} delay={ai * 60}>
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(1.5rem, 3vw, 1.9rem)', fontWeight: '400', color: '#1a1a1a', margin: '0 0 0.35rem', lineHeight: 1.2 }}>
                  {album.name}
                </h2>
                <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', fontFamily: 'var(--font-inter), sans-serif' }}>
                  {formatDate(album.date) ? `${formatDate(album.date)} · ` : ''}{album.photos.length} {album.photos.length === 1 ? 'photo' : 'photos'}
                </div>
              </div>
              <div className="mg-grid">
                {album.photos.map((photo, pi) => (
                  <button key={photo.id} type="button" className="mg-tile"
                    onClick={() => setLightbox({ albumIdx: ai, photoIdx: pi })}
                    aria-label={photo.caption || `Photo ${pi + 1} — ${album.name}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.caption || album.name} loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          </FadeUp>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && currentPhoto && (
        <div
          role="dialog" aria-modal="true" aria-label={current.name}
          onClick={close}
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            if (touchStartX.current === null) return
            const dx = e.changedTouches[0].clientX - touchStartX.current
            touchStartX.current = null
            if (Math.abs(dx) > 45) step(dx > 0 ? -1 : 1)
          }}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(10,16,12,0.96)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 'calc(1rem + env(safe-area-inset-top)) 1rem calc(1.5rem + env(safe-area-inset-bottom))',
          }}>
          <button type="button" onClick={close} aria-label="Close"
            style={{
              position: 'absolute', top: 'calc(0.75rem + env(safe-area-inset-top))', right: '0.9rem',
              background: 'none', border: 'none', cursor: 'pointer', zIndex: 2,
              color: 'rgba(245,241,236,0.7)', fontSize: '26px', lineHeight: 1, padding: '0.6rem',
              fontFamily: 'var(--font-inter), sans-serif', WebkitTapHighlightColor: 'transparent',
            }}>
            ×
          </button>

          {current.photos.length > 1 && (
            <>
              <button type="button" className="mg-lb-nav" style={{ left: 'max(0.25rem, env(safe-area-inset-left))', zIndex: 2 }}
                onClick={e => { e.stopPropagation(); step(-1) }} aria-label="Previous photo">‹</button>
              <button type="button" className="mg-lb-nav" style={{ right: 'max(0.25rem, env(safe-area-inset-right))', zIndex: 2 }}
                onClick={e => { e.stopPropagation(); step(1) }} aria-label="Next photo">›</button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentPhoto.url} alt={currentPhoto.caption || current.name}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 'min(92vw, 1100px)', maxHeight: '76vh', objectFit: 'contain', display: 'block' }} />

          <div onClick={e => e.stopPropagation()} style={{ textAlign: 'center', marginTop: '1.1rem', maxWidth: '85vw', fontFamily: 'var(--font-inter), sans-serif' }}>
            {currentPhoto.caption && (
              <div style={{ fontSize: '13px', color: 'rgba(245,241,236,0.85)', lineHeight: 1.6, marginBottom: '0.4rem' }}>
                {currentPhoto.caption}
              </div>
            )}
            {currentPhoto.tags?.length > 0 && (
              <div style={{ fontSize: '11px', color: 'rgba(197,168,130,0.75)', letterSpacing: '0.02em', marginBottom: '0.4rem' }}>
                Featuring {currentPhoto.tags.join(', ')}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(197,168,130,0.7)' }}>
                {lightbox.photoIdx + 1} / {current.photos.length}
              </div>
              {/* ?download= makes Supabase serve the file as an attachment (full-
                  resolution original when available) instead of opening it inline */}
              <a
                href={`${currentPhoto.originalUrl || currentPhoto.url}?download=${downloadName(current.name, lightbox.photoIdx, currentPhoto.originalUrl || currentPhoto.url)}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: '#F5F1EC', textDecoration: 'none',
                  border: '0.5px solid rgba(197,168,130,0.5)', padding: '0.45rem 1rem',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
