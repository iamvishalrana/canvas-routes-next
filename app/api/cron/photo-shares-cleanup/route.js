import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { captureException } from '../../../../lib/sentry'

const BUCKET = 'photo-shares'

// Deletes every photo_share_folders row (and its storage files) whose
// 30-day expiry has passed. Storage removal happens before the DB delete —
// if it fails partway through, the DB row for that folder is left in place
// so the next run retries it rather than losing track of orphaned files.
// A person who ends up with zero folders left (every event they were
// shared photos for has expired) is removed too, along with their link.
async function cleanupExpiredShares() {
  const supabase = createAdminClient()
  const { data: expired, error } = await supabase
    .from('photo_share_folders').select('id, title, person_id').lte('expires_at', new Date().toISOString())
  if (error) throw new Error(error.message)

  let deletedFiles = 0
  let deletedFolders = 0
  const touchedPersonIds = new Set()
  for (const folder of (expired || [])) {
    const { data: items } = await supabase.from('photo_share_items').select('storage_path, original_path').eq('folder_id', folder.id)
    // gallery_photo_submissions.photo_share_folder_id cascades away with this
    // folder too — any still-pending (never reviewed) upload's storage files
    // would otherwise leak forever, and the submission would silently vanish
    // from the admin review queue with no one ever having seen it.
    const { data: pendingSubmissions } = await supabase.from('gallery_photo_submissions').select('storage_path, original_path').eq('photo_share_folder_id', folder.id)
    const paths = [...new Set([
      ...(items || []).flatMap(i => [i.storage_path, i.original_path]),
      ...(pendingSubmissions || []).flatMap(i => [i.storage_path, i.original_path]),
    ].filter(Boolean))]
    if (paths.length) {
      const { error: removeErr } = await supabase.storage.from(BUCKET).remove(paths)
      if (removeErr) {
        captureException(new Error(removeErr.message), { context: 'photo-shares-cleanup-storage', folderId: folder.id })
        continue // leave the DB row for next run rather than losing the file reference
      }
      deletedFiles += paths.length
    }
    const { error: delErr } = await supabase.from('photo_share_folders').delete().eq('id', folder.id)
    if (delErr) captureException(delErr, { context: 'photo-shares-cleanup-db', folderId: folder.id })
    else { deletedFolders++; touchedPersonIds.add(folder.person_id) }
  }

  // Any person touched this run who now has zero folders left is done —
  // their link no longer leads anywhere, so the row (and the link) go too.
  let deletedPeople = 0
  for (const personId of touchedPersonIds) {
    const { count } = await supabase.from('photo_share_folders').select('id', { count: 'exact', head: true }).eq('person_id', personId)
    if (count === 0) {
      const { error: personDelErr } = await supabase.from('photo_share_people').delete().eq('id', personId)
      if (personDelErr) captureException(personDelErr, { context: 'photo-shares-cleanup-person-db', personId })
      else deletedPeople++
    }
  }

  return { deletedFolders, deletedFiles, deletedPeople, totalExpired: (expired || []).length }
}

// Called by Vercel cron (GET with Authorization: Bearer {CRON_SECRET})
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('Photo-shares cleanup cron: CRON_SECRET is not set — endpoint is disabled for safety')
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await cleanupExpiredShares()
    return Response.json({ ok: true, ...result })
  } catch (err) {
    console.error('Photo-shares cleanup failed:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// Called manually from the admin panel (POST, admin-only)
export async function POST() {
  try {
    const user = await requireAdmin()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const result = await cleanupExpiredShares()
    return Response.json({ ok: true, ...result })
  } catch (err) {
    console.error('Photo-shares cleanup error:', err.message)
    return Response.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
