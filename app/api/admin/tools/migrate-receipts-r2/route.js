import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { r2, objectExists, putObject, getPublicUrl } from '../../../../../lib/r2'
import { captureException } from '../../../../../lib/sentry'

const BUCKET = 'receipts'
const MARKER = '/object/public/receipts/'

// expenses.receipt_url/receipt_urls store full Supabase Storage URLs (unlike
// photo_share_photos, which stores bare relative paths) — extracts just the
// storage path so it can be re-resolved against R2 via getPublicUrl().
function extractPath(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    const idx = u.pathname.indexOf(MARKER)
    if (idx === -1) return null
    return decodeURIComponent(u.pathname.slice(idx + MARKER.length))
  } catch { return null }
}

// One-time migration: copies every receipt file's bytes from Supabase
// Storage to R2, then rewrites expenses.receipt_url/receipt_urls to the new
// R2 URLs — necessary here (unlike photo-shares) because those columns store
// full absolute URLs, not paths resolved fresh at read time. Only rewrites a
// URL once its R2 copy is confirmed present, so a failed/partial copy never
// leaves a DB row pointing at a URL that 404s. Idempotent: paths already in
// R2 are skipped, rows whose URLs already point at R2 are left alone.
export async function POST() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!r2) return Response.json({ error: 'R2 not configured.' }, { status: 500 })

  const admin = createAdminClient()
  const { data: rows, error } = await admin.from('expenses').select('id, receipt_url, receipt_urls')
  if (error) {
    captureException(new Error(error.message), { context: 'migrate-receipts-r2-list' })
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
      captureException(err, { context: 'migrate-receipts-r2-object', path })
    }
  }

  // Rewrite DB URLs — only for paths now confirmed present in R2 (re-checked
  // fresh per row, not assumed from the copy loop above, so a path that
  // failed to copy is correctly left pointing at its still-live Supabase URL).
  let rowsUpdated = 0
  for (const row of rows || []) {
    let changed = false
    let newPrimary = row.receipt_url
    const p1 = extractPath(row.receipt_url)
    if (p1 && await objectExists({ bucket: BUCKET, path: p1 })) {
      const url = getPublicUrl({ bucket: BUCKET, path: p1 })
      if (url && url !== row.receipt_url) { newPrimary = url; changed = true }
    }

    const newArray = []
    for (const u of (row.receipt_urls || [])) {
      const p = extractPath(u)
      const exists = p && await objectExists({ bucket: BUCKET, path: p })
      if (exists) {
        const url = getPublicUrl({ bucket: BUCKET, path: p })
        if (url) { if (url !== u) changed = true; newArray.push(url); continue }
      }
      newArray.push(u)
    }

    if (changed) {
      const { error: updErr } = await admin.from('expenses')
        .update({ receipt_url: newPrimary, receipt_urls: newArray }).eq('id', row.id)
      if (updErr) {
        captureException(updErr, { context: 'migrate-receipts-r2-db-update', id: row.id })
        continue
      }
      rowsUpdated++
    }
  }

  return Response.json({ total: paths.size, copied, alreadyOnR2, failed, rowsUpdated, failures: failures.slice(0, 20) })
}
