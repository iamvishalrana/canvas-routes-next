// Deletes a receipt file from the 'receipts' storage bucket given its public
// URL. Best-effort — callers should not fail their own operation if this fails.
export async function deleteReceiptFile(supabase, receiptUrl) {
  if (!receiptUrl) return
  try {
    const url = new URL(receiptUrl)
    const marker = '/object/public/receipts/'
    const idx = url.pathname.indexOf(marker)
    if (idx === -1) return
    const path = url.pathname.slice(idx + marker.length)
    await supabase.storage.from('receipts').remove([decodeURIComponent(path)])
  } catch {}
}
