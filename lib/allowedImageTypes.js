// Single source of truth for which image formats every upload flow accepts
// — keeps client-side validation maps and server-side bucket
// allowedMimeTypes in sync across gallery-photos, photo-shares,
// event-photos, route-car-photos, and member-photos. HEIC/HEIF and TIFF
// aren't listed here — both are converted to JPEG client-side before they
// ever reach this check (see lib/convertHeicIfNeeded.js and
// lib/convertTiffIfNeeded.js), since no browser can display either format
// natively in an <img> tag (Safari can show HEIC, nothing shows TIFF).
//
// SVG is deliberately NOT listed — 2026-08-24 security review found a
// direct-navigation path that defeats the "always rendered via a plain
// <img> tag, so embedded <script> never executes" assumption the old
// comment here relied on: app/admin/_components/AdminPhotoLightbox.jsx's
// "Download" link opens `photo.originalUrl` in a new tab with the `download`
// attribute, which browsers ignore for cross-origin URLs (the storage
// domain differs from canvasroutes.com) — so it just navigates there
// directly instead of forcing a download. Storage buckets are public and
// multiple upload flows accept photos from non-admins (member/non-member
// gallery submissions, non-member photo-share folders) before an admin ever
// reviews them, so an attacker-crafted SVG with an embedded <script> can
// reach that exact review surface. A top-level navigation to an
// `image/svg+xml` response is NOT sandboxed the way <img src> is — embedded
// scripts execute in that context. Do not re-add SVG support without either
// sanitizing uploaded SVGs server-side or ensuring every link to a raw photo
// URL forces `Content-Disposition: attachment` (e.g. `?download`) — a
// client-side `download` attribute alone is not sufficient for cross-origin links.
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
// Reverse lookup — needed wherever a route only has the extension (not the
// original MIME type) but must still tell R2 what Content-Type to bake into
// a presigned upload URL's signature.
export const EXT_TO_MIME = Object.fromEntries(Object.entries(MIME_TO_EXT).map(([mime, ext]) => [ext, mime]))
