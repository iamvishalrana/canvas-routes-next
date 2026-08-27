import { removeObjects } from './r2'

// Deletes a receipt file from R2 given its public URL. Best-effort — callers
// should not fail their own operation if this fails.
export async function deleteReceiptFile(receiptUrl) {
  if (!receiptUrl) return
  try {
    const url = new URL(receiptUrl)
    const marker = '/media/r2/receipts/'
    const idx = url.pathname.indexOf(marker)
    if (idx === -1) return
    const path = decodeURIComponent(url.pathname.slice(idx + marker.length))
    await removeObjects({ bucket: 'receipts', paths: [path] })
  } catch {}
}
