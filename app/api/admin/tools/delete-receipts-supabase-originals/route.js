import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { getObjectMeta } from '../../../../../lib/r2'
import { captureException } from '../../../../../lib/sentry'

const BUCKET = 'receipts'
const MARKER = '/media/r2/receipts/'

// expenses.receipt_url/receipt_urls were already rewritten to R2 URLs by
// migrate-receipts-r2 — this is what scopes deletion to exactly the paths
// that migration touched (anything else in the Supabase bucket, e.g. the
// unreferenced leftovers found during verification, is never in this set
// and is never touched here).
function extractPath(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    const idx = u.pathname.indexOf(MARKER)
    if (idx === -1) return null
    return decodeURIComponent(u.pathname.slice(idx + MARKER.length))
  } catch { return null }
}

// Deletes the Supabase Storage originals for receipts now that
// migrate-receipts-r2 has copied them to R2 and rewritten the DB URLs.
// Every object is re-verified immediately before its Supabase copy is
// deleted: downloads the Supabase bytes fresh and compares the exact byte
// length against R2's HeadObject size. Any mismatch, any R2-missing, any
// download error — that path is skipped, not deleted, and reported. Safe to
// re-run; anything already gone from Supabase is treated as done.
export async function POST() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data: rows, error } = await admin.from('expenses').select('id, receipt_url, receipt_urls')
  if (error) {
    captureException(new Error(error.message), { context: 'delete-receipts-supabase-list' })
    return Response.json({ error: error.message }, { status: 500 })
  }

  const paths = new Set()
  for (const row of rows || []) {
    const p1 = extractPath(row.receipt_url)
    if (p1) paths.add(p1)
    for (const u of row.receipt_urls || []) {
      const p = extractPath(u)
      if (p) paths.add(p)
    }
  }

  let deleted = 0, alreadyGone = 0, skippedUnverified = 0, failed = 0
  const skipped = []

  for (const path of paths) {
    try {
      const { data: blob, error: dlErr } = await admin.storage.from(BUCKET).download(path)
      if (dlErr || !blob) { alreadyGone++; continue }

      const supabaseSize = blob.size
      const r2Meta = await getObjectMeta({ bucket: BUCKET, path })
      if (!r2Meta) {
        skippedUnverified++
        skipped.push({ path, reason: 'not found in R2' })
        continue
      }
      if (r2Meta.size !== supabaseSize) {
        skippedUnverified++
        skipped.push({ path, reason: `size mismatch (supabase ${supabaseSize} vs r2 ${r2Meta.size})` })
        continue
      }

      const { error: rmErr } = await admin.storage.from(BUCKET).remove([path])
      if (rmErr) {
        failed++
        skipped.push({ path, reason: rmErr.message })
        continue
      }
      deleted++
    } catch (err) {
      failed++
      skipped.push({ path, reason: err.message })
      captureException(err, { context: 'delete-receipts-supabase-object', path })
    }
  }

  return Response.json({ total: paths.size, deleted, alreadyGone, skippedUnverified, failed, skipped: skipped.slice(0, 20) })
}
