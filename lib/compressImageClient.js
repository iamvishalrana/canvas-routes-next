// Downscales + re-encodes a photo client-side before upload, for use as a
// "display" copy alongside the untouched original. Supabase's on-the-fly
// image transform endpoint (used briefly instead of this) turned out to be
// unreliable for large camera originals — DSLR/mirrorless JPEGs routinely
// run 20-40MB, which either fails the transform outright (broken-image
// icon) or succeeds but is slow enough that "loading" looks indistinguishable
// from broken. A real, small, pre-generated copy has neither problem.
// Falls back to the original file on any failure (e.g. createImageBitmap
// unsupported) so a display copy is always produced, even if unoptimized.
// Options (all optional; defaults preserve the original display-copy behaviour):
//   maxEdge — longest edge in px to scale down to (default 2000)
//   quality — JPEG quality 0..1 (default 0.85)
// The receipt-scanning flow passes a smaller maxEdge + lower quality: the OCR
// vision API already downscales anything past ~1568px on the long edge (so a
// 2000px copy is billed the same as 1568 but never sharper), and going a little
// BELOW that cap is what actually cuts image tokens — while the untouched
// original is still what gets stored/attached to the expense.
export async function compressImageClient(file, { maxEdge = 2000, quality = 0.85 } = {}) {
  try {
    let bitmap
    try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }) }
    catch { bitmap = await createImageBitmap(file) }
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < 2.5 * 1024 * 1024) { bitmap.close?.(); return file }
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch { return file }
}
