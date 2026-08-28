import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { r2, objectExists, putObject, getPublicUrl } from '../../../../../lib/r2'
import { captureException } from '../../../../../lib/sentry'

export const maxDuration = 300

const BUCKET = 'gallery-photos'
const CONCURRENCY = 10

// Runs fn over items with at most `limit` in flight at once — the copy/
// rewrite loops below process well over a hundred files; doing that fully
// sequentially (one network round-trip at a time) risked running long enough
// to hit Vercel's function timeout even though every file eventually
// succeeded, which is exactly what produced a misleading "Migration failed."
// client error despite the migration actually completing server-side.
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

// One-time migration: copies every gallery-photos file's bytes from Supabase
// Storage to R2, then rewrites gallery_photos.photo_url/original_url AND
// gallery_photo_submissions.photo_url/original_url (any still-pending,
// unreviewed uploads) to the new R2 URLs. Unlike receipts, storage_path/
// original_path here are already bare relative paths (not embedded in a
// URL), so no path-extraction step is needed — only the two *_url columns
// get rewritten. Only rewrites a URL once its R2 copy is confirmed present,
// so a failed/partial copy never leaves a DB row pointing at a URL that
// 404s. Idempotent: paths already in R2 are skipped, rows whose URLs already
// point at R2 are left alone.
export async function POST() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!r2) return Response.json({ error: 'R2 not configured.' }, { status: 500 })

  const admin = createAdminClient()
  const [{ data: photos, error: photosErr }, { data: submissions, error: subsErr }] = await Promise.all([
    admin.from('gallery_photos').select('id, storage_path, original_path'),
    admin.from('gallery_photo_submissions').select('id, storage_path, original_path'),
  ])
  if (photosErr || subsErr) {
    const msg = (photosErr || subsErr).message
    captureException(new Error(msg), { context: 'migrate-gallery-photos-r2-list' })
    return Response.json({ error: msg }, { status: 500 })
  }

  const paths = new Set()
  for (const row of [...(photos || []), ...(submissions || [])]) {
    if (row.storage_path) paths.add(row.storage_path)
    if (row.original_path) paths.add(row.original_path)
  }

  let copied = 0, alreadyOnR2 = 0, failed = 0
  const failures = []
  await mapLimit([...paths], CONCURRENCY, async (path) => {
    try {
      if (await objectExists({ bucket: BUCKET, path })) { alreadyOnR2++; return }
      const { data: blob, error: dlErr } = await admin.storage.from(BUCKET).download(path)
      if (dlErr || !blob) {
        failed++
        failures.push({ path, error: dlErr?.message || 'not found in Supabase' })
        return
      }
      const buffer = Buffer.from(await blob.arrayBuffer())
      await putObject({ bucket: BUCKET, path, buffer, contentType: blob.type || 'application/octet-stream' })
      copied++
    } catch (err) {
      failed++
      failures.push({ path, error: err.message })
      captureException(err, { context: 'migrate-gallery-photos-r2-object', path })
    }
  })

  // Rewrite DB URLs — only for paths now confirmed present in R2 (re-checked
  // fresh, not assumed from the copy loop above, so a path that failed to
  // copy is correctly left pointing at its still-live Supabase URL).
  async function rewriteRows(table, rows) {
    let updated = 0
    await mapLimit(rows || [], CONCURRENCY, async (row) => {
      const updates = {}
      if (row.storage_path && await objectExists({ bucket: BUCKET, path: row.storage_path })) {
        const url = getPublicUrl({ bucket: BUCKET, path: row.storage_path })
        if (url) updates.photo_url = url
      }
      if (row.original_path && await objectExists({ bucket: BUCKET, path: row.original_path })) {
        const url = getPublicUrl({ bucket: BUCKET, path: row.original_path })
        if (url) updates.original_url = url
      }
      if (Object.keys(updates).length) {
        const { error: updErr } = await admin.from(table).update(updates).eq('id', row.id)
        if (updErr) { captureException(updErr, { context: `migrate-gallery-photos-r2-db-update-${table}`, id: row.id }); return }
        updated++
      }
    })
    return updated
  }

  const [photoRowsUpdated, submissionRowsUpdated] = await Promise.all([
    rewriteRows('gallery_photos', photos),
    rewriteRows('gallery_photo_submissions', submissions),
  ])

  return Response.json({
    total: paths.size, copied, alreadyOnR2, failed,
    rowsUpdated: photoRowsUpdated + submissionRowsUpdated,
    photoRowsUpdated, submissionRowsUpdated,
    failures: failures.slice(0, 20),
  })
}
