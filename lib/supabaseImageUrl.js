// Supabase Storage serves on-the-fly resized/optimized variants of an
// already-uploaded image via a `/render/image/` endpoint that mirrors the
// normal public object URL — no need to separately upload/store a second
// "display" or "thumbnail" copy the way the old client-side-compression
// approach did. https://supabase.com/docs/guides/storage/serving/image-transformations
//
// width/height: 1-2500px. resize: 'cover' | 'contain' | 'fill'. quality: 20-100.
export function buildTransformedUrl(publicUrl, { width, height, resize = 'cover', quality } = {}) {
  if (!publicUrl) return publicUrl
  const [base, query] = publicUrl.split('?')
  if (!base.includes('/object/public/')) return publicUrl // not a Supabase Storage public URL — leave untouched
  const renderBase = base.replace('/object/public/', '/render/image/public/')
  const params = new URLSearchParams(query || '')
  if (width) params.set('width', String(width))
  if (height) params.set('height', String(height))
  if (width || height) params.set('resize', resize)
  if (quality) params.set('quality', String(quality))
  const qs = params.toString()
  return qs ? `${renderBase}?${qs}` : renderBase
}
