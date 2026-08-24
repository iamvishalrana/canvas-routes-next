// Single source of truth for which image formats every upload flow accepts
// — keeps client-side validation maps and server-side bucket
// allowedMimeTypes in sync across gallery-photos, photo-shares,
// event-photos, route-car-photos, and member-photos. HEIC/HEIF and TIFF
// aren't listed here — both are converted to JPEG client-side before they
// ever reach this check (see lib/convertHeicIfNeeded.js and
// lib/convertTiffIfNeeded.js), since no browser can display either format
// natively in an <img> tag (Safari can show HEIC, nothing shows TIFF).
//
// SVG is listed and stored/served as-is — every display site in this
// codebase renders photos through a plain <img src=...> tag, never inline
// or via <object>/<iframe>, so an SVG's embedded <script>/event-handler
// content (if any) never executes; the browser treats it as a flat raster
// image in that context. Don't add an inline-SVG or dangerouslySetInnerHTML
// display path for user-uploaded photos without re-reviewing this.
export const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
}
export const ALLOWED_MIME_TYPES = Object.keys(MIME_TO_EXT)
export const ALLOWED_EXTS = Object.values(MIME_TO_EXT)
// Reverse lookup — needed wherever a route only has the extension (not the
// original MIME type) but must still tell R2 what Content-Type to bake into
// a presigned upload URL's signature.
export const EXT_TO_MIME = Object.fromEntries(Object.entries(MIME_TO_EXT).map(([mime, ext]) => [ext, mime]))
