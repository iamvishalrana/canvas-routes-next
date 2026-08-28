import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { getObjectMeta } from '../../../../../lib/r2'
import { captureException } from '../../../../../lib/sentry'

const BUCKET = 'gallery-photos'

// Deletes the Supabase Storage originals for gallery-photos now that
// migrate-gallery-photos-r2 has copied them to R2 and rewritten the DB URLs.
// Paths are read directly from gallery_photos.storage_path/original_path AND
// gallery_photo_submissions (pending, unreviewed uploads) — every file is
// re-verified immediately before its Supabase copy is deleted: downloads the
// Supabase bytes fresh and compares the exact byte length against R2's
// HeadObject size. Any mismatch, any R2-missing, any download error — that
// path is skipped, not deleted, and reported. Safe to re-run; anything
// already gone from Supabase is treated as done.
export async function POST() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const [{ data: photos, error: photosErr }, { data: submissions, error: subsErr }] = await Promise.all([
    admin.from('gallery_photos').select('id, storage_path, original_path'),
    admin.from('gallery_photo_submissions').select('id, storage_path, original_path'),
  ])
  if (photosErr || subsErr) {
    const msg = (photosErr || subsErr).message
    captureException(new Error(msg), { context: 'delete-gallery-photos-supabase-list' })
    return Response.json({ error: msg }, { status: 500 })
  }

  const paths = new Set()
  for (const row of [...(photos || []), ...(submissions || [])]) {
    if (row.storage_path) paths.add(row.storage_path)
    if (row.original_path) paths.add(row.original_path)
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
      captureException(err, { context: 'delete-gallery-photos-supabase-object', path })
    }
  }

  return Response.json({ total: paths.size, deleted, alreadyGone, skippedUnverified, failed, skipped: skipped.slice(0, 20) })
}
