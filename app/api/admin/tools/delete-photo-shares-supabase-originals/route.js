import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { getObjectMeta } from '../../../../../lib/r2'
import { captureException } from '../../../../../lib/sentry'

const BUCKET = 'photo-shares'

// Deletes the Supabase Storage originals for photo-shares now that the
// migrate-photo-shares-r2 tool has copied them to R2 — reclaims the
// Supabase storage quota this migration exists to free up.
//
// Scope is intentionally identical to the migration tool: only paths
// currently referenced by photo_share_photos.storage_path/original_path.
// Anything in the Supabase bucket NOT in that set (e.g. the one orphaned
// leftover found during verification, predating this migration) is never
// touched — this route has no "delete everything in the bucket" mode.
//
// Every single object is re-verified against R2 immediately before its
// Supabase copy is deleted: downloads the Supabase bytes fresh (not cached
// metadata) and compares the exact byte length against R2's HeadObject
// size. Any mismatch, any R2-missing, any download error — that path is
// skipped, not deleted, and reported. Safe to re-run; anything already
// gone from Supabase is treated as done, not a failure.
export async function POST() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data: rows, error } = await admin.from('photo_share_photos').select('id, storage_path, original_path')
  if (error) {
    captureException(new Error(error.message), { context: 'delete-photo-shares-supabase-list' })
    return Response.json({ error: error.message }, { status: 500 })
  }

  const paths = new Set()
  for (const row of rows || []) {
    if (row.storage_path) paths.add(row.storage_path)
    if (row.original_path) paths.add(row.original_path)
  }

  let deleted = 0, alreadyGone = 0, skippedUnverified = 0, failed = 0
  const skipped = []

  async function processOne(path) {
    try {
      const { data: blob, error: dlErr } = await admin.storage.from(BUCKET).download(path)
      if (dlErr || !blob) { alreadyGone++; return } // nothing left in Supabase to delete

      const supabaseSize = blob.size
      const r2Meta = await getObjectMeta({ bucket: BUCKET, path })
      if (!r2Meta) {
        skippedUnverified++
        skipped.push({ path, reason: 'not found in R2' })
        return
      }
      if (r2Meta.size !== supabaseSize) {
        skippedUnverified++
        skipped.push({ path, reason: `size mismatch (supabase ${supabaseSize} vs r2 ${r2Meta.size})` })
        return
      }

      const { error: rmErr } = await admin.storage.from(BUCKET).remove([path])
      if (rmErr) {
        failed++
        skipped.push({ path, reason: rmErr.message })
        return
      }
      deleted++
    } catch (err) {
      failed++
      skipped.push({ path, reason: err.message })
      captureException(err, { context: 'delete-photo-shares-supabase-object', path })
    }
  }

  const CONCURRENCY = 10
  const queue = [...paths]
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const path = queue.shift()
      if (path) await processOne(path)
    }
  }))

  return Response.json({ total: paths.size, deleted, alreadyGone, skippedUnverified, failed, skipped: skipped.slice(0, 20) })
}
