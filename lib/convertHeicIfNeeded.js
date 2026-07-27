// HEIC/HEIF (the default format for photos on iOS since iOS 11) can't be
// displayed by an <img> tag in any browser except Safari — uploading one
// raw would silently break for every non-Safari viewer of a shared gallery.
// iOS auto-converts to JPEG when picking from the Photos app, but sharing
// via AirDrop/Files/other apps can still hand over a raw .heic file. Detect
// and convert to JPEG client-side before it ever reaches upload validation,
// rather than rejecting it outright.
//
// heic2any bundles a WASM HEIF decoder (~1MB) — dynamically imported so it
// never loads for the common case (nothing to convert).
export function isHeicFile(file) {
  const type = (file.type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()
  return type === 'image/heic' || type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif')
}

export async function convertHeicIfNeeded(file) {
  if (!isHeicFile(file)) return file
  try {
    const heic2any = (await import('heic2any')).default
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    const blob = Array.isArray(result) ? result[0] : result
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    // Let it fall through to the normal "unsupported format" rejection
    // downstream rather than silently failing the whole upload batch.
    return file
  }
}
