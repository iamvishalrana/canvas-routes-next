import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { r2, objectExists, putObject, getPublicUrl } from '../../../../../lib/r2'
import { captureException } from '../../../../../lib/sentry'

const BUCKET = 'gallery-photos'

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
  for (const path of paths) {
    try {
      if (await objectExists({ bucket: BUCKET, path })) { alreadyOnR2++; continue }
      const { data: blob, error: dlErr } = await admin.storage.from(BUCKET).download(path)
      if (dlErr || !blob) {
        failed++
        failures.push({ path, error: dlErr?.message || 'not found in Supabase' })
        continue
      }
      const buffer = Buffer.from(await blob.arrayBuffer())
      await putObject({ bucket: BUCKET, path, buffer, contentType: blob.type || 'application/octet-stream' })
      copied++
    } catch (err) {
      failed++
      failures.push({ path, error: err.message })
      captureException(err, { context: 'migrate-gallery-photos-r2-object', path })
    }
  }

  // Rewrite DB URLs — only for paths now confirmed present in R2 (re-checked
  // fresh, not assumed from the copy loop above, so a path that failed to
  // copy is correctly left pointing at its still-live Supabase URL).
  async function rewriteRows(table, rows) {
    let updated = 0
    for (const row of rows || []) {
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
        if (updErr) { captureException(updErr, { context: `migrate-gallery-photos-r2-db-update-${table}`, id: row.id }); continue }
        updated++
      }
    }
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
