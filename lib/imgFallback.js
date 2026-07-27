// Supabase's on-the-fly image transform endpoint (used for grid/thumbnail
// display sizes) can fail on very large source images — a 40+MB DSLR
// original routinely exceeds what the transform service will process,
// returning an error response instead of image bytes, which renders as a
// broken-image icon. Falls back to the untransformed original on error so
// the photo still displays (just at full size) instead of breaking.
export function onImgError(fallbackUrl) {
  return (e) => {
    if (fallbackUrl && e.currentTarget.src !== fallbackUrl) {
      e.currentTarget.onerror = null
      e.currentTarget.src = fallbackUrl
    }
  }
}
