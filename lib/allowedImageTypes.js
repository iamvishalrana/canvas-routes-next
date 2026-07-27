// Single source of truth for which image formats every upload flow accepts
// — keeps client-side validation maps and server-side bucket
// allowedMimeTypes in sync across gallery-photos, photo-shares,
// event-photos, route-car-photos, and member-photos. HEIC/HEIF isn't
// listed here — it's converted to JPEG client-side before it ever reaches
// this check (see lib/convertHeicIfNeeded.js), since no browser but Safari
// can display a raw .heic file.
export const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/avif': 'avif',
}
export const ALLOWED_MIME_TYPES = Object.keys(MIME_TO_EXT)
export const ALLOWED_EXTS = Object.values(MIME_TO_EXT)
