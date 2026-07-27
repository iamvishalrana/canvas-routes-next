// Downscales + re-encodes a photo client-side before upload, for use as a
// "display" copy alongside the untouched original. Supabase's on-the-fly
// image transform endpoint (used briefly instead of this) turned out to be
// unreliable for large camera originals — DSLR/mirrorless JPEGs routinely
// run 20-40MB, which either fails the transform outright (broken-image
// icon) or succeeds but is slow enough that "loading" looks indistinguishable
// from broken. A real, small, pre-generated copy has neither problem.
// Falls back to the original file on any failure (e.g. createImageBitmap
// unsupported) so a display copy is always produced, even if unoptimized.
export async function compressImageClient(file) {
  try {
    let bitmap
    try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }) }
    catch { bitmap = await createImageBitmap(file) }
    const MAX = 2000
    const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < 2.5 * 1024 * 1024) { bitmap.close?.(); return file }
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.85))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch { return file }
}
