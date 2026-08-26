import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { r2, objectExists, putObject } from '../../../../../lib/r2'
import { EXT_TO_MIME } from '../../../../../lib/allowedImageTypes'
import { captureException } from '../../../../../lib/sentry'

const BUCKET = 'photo-shares'

function guessContentType(blobType, path) {
  if (blobType) return blobType
  const ext = (path.split('.').pop() || '').toLowerCase()
  return EXT_TO_MIME[ext] || 'application/octet-stream'
}

// One-time migration: copies every photo-shares object's bytes from Supabase
// Storage (where they were originally uploaded) into R2 (where reads now
// resolve, since lib/gallerySharePhotos.js builds URLs via getPublicUrl()
// against R2 at read time, not a stored absolute URL). Reads the exact key
// list from photo_share_photos.storage_path/original_path rather than
// listing the Supabase bucket recursively — those columns ARE the full set
// of keys any code path will ever ask R2 for.
//
// Idempotent/resumable by design: skips any key that already exists in R2
// (objectExists check before every upload), so re-running after a timeout
// or partial failure only touches what's still missing — safe to call
// repeatedly from the admin Tools button until it reports 0 remaining.
// Copy-only — never deletes the Supabase originals, so there is no data-loss
// window; that cleanup is a deliberate separate step once this is verified.
export async function POST() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!r2) return Response.json({ error: 'R2 not configured.' }, { status: 500 })

  const admin = createAdminClient()
  const { data: rows, error } = await admin.from('photo_share_photos').select('id, storage_path, original_path')
  if (error) {
    captureException(new Error(error.message), { context: 'migrate-photo-shares-r2-list' })
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Dedup — original_path sometimes equals storage_path, and this must never
  // upload the same key twice in one run.
  const paths = new Set()
  for (const row of rows || []) {
    if (row.storage_path) paths.add(row.storage_path)
    if (row.original_path) paths.add(row.original_path)
  }

  let copied = 0, skipped = 0, failed = 0
  const failures = []

  async function migrateOne(path) {
    try {
      if (await objectExists({ bucket: BUCKET, path })) { skipped++; return }

      const { data: blob, error: dlErr } = await admin.storage.from(BUCKET).download(path)
      if (dlErr || !blob) {
        failed++
        failures.push({ path, error: dlErr?.message || 'not found in Supabase' })
        return
      }
      const buffer = Buffer.from(await blob.arrayBuffer())
      await putObject({ bucket: BUCKET, path, buffer, contentType: guessContentType(blob.type, path) })
      copied++
    } catch (err) {
      failed++
      failures.push({ path, error: err.message })
      captureException(err, { context: 'migrate-photo-shares-r2-object', path })
    }
  }

  // Bounded concurrency — 282 objects run sequentially could brush up
  // against the function timeout; 10-at-a-time keeps this well within it
  // without hammering either Supabase or R2.
  const CONCURRENCY = 10
  const queue = [...paths]
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const path = queue.shift()
      if (path) await migrateOne(path)
    }
  }))

  return Response.json({ total: paths.size, copied, skipped, failed, failures: failures.slice(0, 20) })
}
