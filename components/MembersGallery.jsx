'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import JSZip from 'jszip'
import FadeUp from './FadeUp'
import { onImgError } from '../lib/imgFallback'
import { membersPhotosT } from '../lib/i18n/membersPhotos'

function formatDate(d, lang) {
  if (!d) return null
  return new Date(d + 'T12:00:00').toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

function downloadName(album, idx, url) {
  const slug = album.replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'canvas-routes'
  const ext = (url.split('?')[0].split('.').pop() || 'jpg').toLowerCase()
  return `${slug}-${idx + 1}.${ext}`
}

export default function MembersGallery({ albums, lang = 'en' }) {
  // lightbox: { albumIdx, photoIdx } or null
  const [lightbox, setLightbox] = useState(null)
  // { albumIdx, done, total, failed } or null — one zip download at a time
  const [zipping, setZipping] = useState(null)
  // { albumIdx, failed, total } or null — set after a zip finishes with skipped photos
  const [zipResult, setZipResult] = useState(null)
  // { [albumIdx]: tagString } — "Featuring: X" tags (member-tagged photos
  // only; non-member share links carry no tags, so these chips just never
  // render there) turned from display-only text into an actual filter.
  const [tagFilters, setTagFilters] = useState({})
  const [shareCopied, setShareCopied] = useState(false)
  const touchStartX = useRef(null)
  const t = membersPhotosT[lang]

  function sharePhoto(photo, albumName) {
    const url = photo.url
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: albumName, text: photo.caption || albumName, url }).catch(() => {})
    } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setShareCopied(true); setTimeout(() => setShareCopied(false), 1800)
      }).catch(() => {})
    }
  }

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
    // Lock background scroll while the lightbox is open — plain
    // overflow:hidden alone doesn't stop iOS Safari's rubber-band scroll and
    // loses the page's scroll position; position:fixed + restoring the
    // stored scrollY (same technique used for every other modal on the site)
    // fixes both.
    const scrollY = window.scrollY
    const body = document.body
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    return () => {
      window.removeEventListener('keydown', onKey)
      const top = body.style.top
      body.style.overflow = ''
      body.style.position = ''
      body.style.top = ''
      body.style.width = ''
      if (top) window.scrollTo(0, -parseInt(top, 10))
    }
  }, [lightbox, close, step])

  const current = lightbox ? albums[lightbox.albumIdx] : null
  const currentPhoto = current ? current.photos[lightbox.photoIdx] : null

  // Bundles every full-resolution original in an album into a single .zip —
  // fetched and packaged entirely client-side (no new server endpoint), same
  // pattern this codebase already uses for other client-generated exports
  // (jsPDF, docx, xlsx). One failed photo just gets skipped rather than
  // aborting the whole download.
  async function downloadAlbum(album, ai) {
    setZipResult(null)
    setZipping({ albumIdx: ai, done: 0, total: album.photos.length, failed: 0 })
    let failedCount = 0
    try {
      const zip = new JSZip()
      for (let i = 0; i < album.photos.length; i++) {
        const photo = album.photos[i]
        const url = photo.originalUrl || photo.url
        try {
          const res = await fetch(url)
          if (!res.ok) throw new Error('fetch failed')
          const blob = await res.blob()
          zip.file(downloadName(album.name, i, url), blob)
        } catch {
          failedCount += 1
          setZipping(z => z ? { ...z, failed: z.failed + 1 } : z)
        }
        setZipping(z => z ? { ...z, done: i + 1 } : z)
      }
      const content = await zip.generateAsync({ type: 'blob' })
      const slug = album.name.replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'canvas-routes'
      const a = document.createElement('a')
      a.href = URL.createObjectURL(content)
      a.download = `${slug}.zip`
      a.click()
      URL.revokeObjectURL(a.href)
    } finally {
      setZipping(null)
      if (failedCount > 0) setZipResult({ albumIdx: ai, failed: failedCount, total: album.photos.length })
    }
  }

  return (
    <div>
      <style>{`
        @keyframes mg-tile-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes mg-lb-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mg-lb-img-in { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        .mg-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 0.7rem;
        }
        @media (max-width: 640px) {
          .mg-grid { grid-template-columns: repeat(2, 1fr); gap: 0.55rem; }
        }
        .mg-tile {
          position: relative;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          background: rgba(0,0,0,0.05);
          border: none;
          border-radius: 6px;
          padding: 0;
          cursor: pointer;
          display: block;
          width: 100%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 20px -8px rgba(0,0,0,0.14);
          transition: box-shadow 0.35s cubic-bezier(0.23,1,0.32,1), transform 0.35s cubic-bezier(0.23,1,0.32,1);
          animation: mg-tile-in 0.5s cubic-bezier(0.16,1,0.3,1) both;
          -webkit-tap-highlight-color: transparent;
        }
        .mg-tile:active { transform: scale(0.97); }
        .mg-tile img {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
          transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
        }
        @media (hover: hover) {
          .mg-tile:hover { box-shadow: 0 4px 10px rgba(0,0,0,0.1), 0 16px 32px -10px rgba(0,0,0,0.24); transform: translateY(-3px); }
          .mg-tile:hover img { transform: scale(1.05); }
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
        @media (max-width: 640px) { .mg-lb-nav { padding: 0.75rem 0.65rem; font-size: 24px; min-width: 44px; box-sizing: border-box; } }
        .mg-dl-all { transition: border-color 0.15s, color 0.15s, background 0.15s; }
        @media (hover: hover) { .mg-dl-all:hover:not(:disabled) { border-color: rgba(197,168,130,0.8) !important; color: #8a7a5c !important; background: rgba(197,168,130,0.06) !important; } }
        .mg-tag-chip {
          background: none; border: 0.5px solid rgba(0,0,0,0.15); border-radius: 99px;
          padding: 0.5rem 1rem; min-height: 44px; box-sizing: border-box;
          font-size: 10.5px; letter-spacing: 0.04em; color: #777; cursor: pointer;
          font-family: var(--font-inter), sans-serif; transition: all 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .mg-tag-chip[data-active="true"] { background: #0F1E14; border-color: #0F1E14; color: #F5F1EC; }
        @media (hover: hover) {
          .mg-tag-chip:not([data-active="true"]):hover { border-color: rgba(197,168,130,0.6); color: #8a7a5c; }
        }
        .mg-share-btn { transition: color 0.15s, border-color 0.15s; }
        @media (hover: hover) { .mg-share-btn:hover { color: #F5F1EC !important; border-color: rgba(197,168,130,0.85) !important; } }
        /* Download/Share/counter row — three bordered pills plus French copy
           ("Télécharger"/"Partager") can exceed 85vw on sub-380px phones;
           flexWrap (set inline) lets it break onto two centered lines
           instead of squeezing or clipping past the viewport edge. */
        @media (max-width: 380px) {
          .mg-lb-actions { gap: 0.6rem; }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
        {albums.map((album, ai) => {
          const isZippingThis = zipping?.albumIdx === ai
          return (
          <FadeUp key={album.name} delay={ai * 60}>
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: 'clamp(1.5rem, 3vw, 1.9rem)', fontWeight: '400', color: '#1a1a1a', margin: '0 0 0.35rem', lineHeight: 1.2 }}>
                    {album.name}
                  </h2>
                  <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', fontFamily: 'var(--font-inter), sans-serif' }}>
                    {formatDate(album.date, lang) ? `${formatDate(album.date, lang)} · ` : ''}{album.photos.length} {album.photos.length === 1 ? t.photo : t.photos}{album.note ? ` · ${album.note}` : ''}
                  </div>
                </div>
                {album.photos.length > 0 && (
                  <button type="button" className="mg-dl-all" onClick={() => downloadAlbum(album, ai)} disabled={!!zipping}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0,
                      fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase',
                      color: isZippingThis ? '#8a7a5c' : '#666', background: 'none',
                      border: '0.5px solid rgba(0,0,0,0.18)', borderRadius: '99px', padding: '0.5rem 1rem',
                      minHeight: '44px', boxSizing: 'border-box',
                      cursor: zipping ? 'default' : 'pointer', opacity: (zipping && !isZippingThis) ? 0.4 : 1,
                      fontFamily: 'var(--font-inter), sans-serif', WebkitTapHighlightColor: 'transparent',
                    }}>
                    {isZippingThis ? (
                      <>{t.zipping(zipping.done, zipping.total)}</>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        {t.downloadAll}
                      </>
                    )}
                  </button>
                )}
              </div>
              {zipResult?.albumIdx === ai && (
                <div style={{ fontSize: '10.5px', color: '#93333E', textAlign: 'right', marginBottom: '0.75rem' }}>
                  {t.zipFailed(zipResult.failed, zipResult.total, zipResult.total === 1 ? '' : 's')}
                </div>
              )}
              {(() => {
                const allTags = [...new Set(album.photos.flatMap(p => p.tags || []))]
                if (allTags.length === 0) return null
                const active = tagFilters[ai]
                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.1rem' }}>
                    <button type="button" className="mg-tag-chip" data-active={!active}
                      onClick={() => setTagFilters(f => ({ ...f, [ai]: undefined }))}>
                      {t.allPhotos}
                    </button>
                    {allTags.map(tag => (
                      <button key={tag} type="button" className="mg-tag-chip" data-active={active === tag}
                        onClick={() => setTagFilters(f => ({ ...f, [ai]: f[ai] === tag ? undefined : tag }))}>
                        {tag}
                      </button>
                    ))}
                  </div>
                )
              })()}
              <div className="mg-grid">
                {album.photos
                  .map((photo, pi) => ({ photo, pi }))
                  .filter(({ photo }) => !tagFilters[ai] || (photo.tags || []).includes(tagFilters[ai]))
                  .map(({ photo, pi }, vi) => (
                    <button key={photo.id} type="button" className="mg-tile" style={{ animationDelay: `${Math.min(vi, 12) * 35}ms` }}
                      onClick={() => setLightbox({ albumIdx: ai, photoIdx: pi })}
                      aria-label={photo.caption || `Photo ${pi + 1} — ${album.name}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photo.caption || album.name} loading="lazy" onError={onImgError(photo.originalUrl)} />
                    </button>
                  ))}
              </div>
            </div>
          </FadeUp>
          )
        })}
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
            animation: 'mg-lb-in 0.25s ease both',
          }}>
          <button type="button" onClick={close} aria-label={t.close}
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
                onClick={e => { e.stopPropagation(); step(-1) }} aria-label={t.previousPhoto}>‹</button>
              <button type="button" className="mg-lb-nav" style={{ right: 'max(0.25rem, env(safe-area-inset-right))', zIndex: 2 }}
                onClick={e => { e.stopPropagation(); step(1) }} aria-label={t.nextPhoto}>›</button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={currentPhoto.id} src={currentPhoto.url} alt={currentPhoto.caption || current.name}
            onClick={e => e.stopPropagation()}
            onError={onImgError(currentPhoto.originalUrl)}
            style={{
              maxWidth: 'min(92vw, 1100px)', maxHeight: '76vh', objectFit: 'contain', display: 'block',
              borderRadius: '3px', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.6)',
              animation: 'mg-lb-img-in 0.3s cubic-bezier(0.16,1,0.3,1) both',
            }} />

          <div onClick={e => e.stopPropagation()} style={{ textAlign: 'center', marginTop: '1.1rem', maxWidth: '85vw', fontFamily: 'var(--font-inter), sans-serif' }}>
            {currentPhoto.caption && (
              <div style={{ fontSize: '13px', color: 'rgba(245,241,236,0.85)', lineHeight: 1.6, marginBottom: '0.4rem' }}>
                {currentPhoto.caption}
              </div>
            )}
            {currentPhoto.tags?.length > 0 && (
              <div style={{ fontSize: '11px', color: 'rgba(197,168,130,0.75)', letterSpacing: '0.02em', marginBottom: '0.4rem' }}>
                {t.featuring(currentPhoto.tags.join(', '))}
              </div>
            )}
            <div className="mg-lb-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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
                  minHeight: '44px', boxSizing: 'border-box',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {t.download}
              </a>
              <button type="button" className="mg-share-btn" onClick={() => sharePhoto(currentPhoto, current.name)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: 'rgba(245,241,236,0.7)', background: 'none', cursor: 'pointer',
                  border: '0.5px solid rgba(245,241,236,0.3)', padding: '0.45rem 1rem',
                  minHeight: '44px', boxSizing: 'border-box',
                  fontFamily: 'var(--font-inter), sans-serif', WebkitTapHighlightColor: 'transparent',
                }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"/><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"/></svg>
                {shareCopied ? t.linkCopied : t.share}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
