// TIFF isn't displayable by an <img> tag in any browser — unlike HEIC (which
// Safari can at least show), nothing renders raw TIFF natively. Detect and
// convert to JPEG client-side before it ever reaches upload validation,
// same pattern as lib/convertHeicIfNeeded.js.
//
// utif2 decodes to raw RGBA pixels (no native TIFF decode API exists in the
// browser, unlike HEIC where createImageBitmap can sometimes help) — painted
// onto a canvas and re-encoded as JPEG from there. Dynamically imported so it
// never loads for the common case (nothing to convert).
export function isTiffFile(file) {
  const type = (file.type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()
  return type === 'image/tiff' || type === 'image/tif' || name.endsWith('.tiff') || name.endsWith('.tif')
}

export async function convertTiffIfNeeded(file) {
  if (!isTiffFile(file)) return file
  try {
    const UTIF = (await import('utif2')).default
    const buffer = await file.arrayBuffer()
    const ifds = UTIF.decode(buffer)
    if (!ifds?.length) throw new Error('No image data in TIFF')
    const first = ifds[0]
    UTIF.decodeImage(buffer, first)
    const rgba = UTIF.toRGBA8(first) // Uint8ClampedArray-compatible RGBA bytes
    const canvas = document.createElement('canvas')
    canvas.width = first.width
    canvas.height = first.height
    const ctx = canvas.getContext('2d')
    ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), first.width, first.height), 0, 0)
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9))
    if (!blob) throw new Error('TIFF canvas export failed')
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    // Let it fall through to the normal "unsupported format" rejection
    // downstream rather than silently failing the whole upload batch.
    return file
  }
}
