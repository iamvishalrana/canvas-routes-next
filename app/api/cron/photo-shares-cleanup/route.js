import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { captureException } from '../../../../lib/sentry'
import { cleanupOrphanedPhotos } from '../../../../lib/photoShareDedup'

const BUCKET = 'photo-shares'

// Deletes every photo_share_folders row whose 30-day expiry has passed.
// Photo LINKS cascade away with each folder, but a shared photo (a group
// shot also linked into someone else's still-active folder) keeps its
// storage file and canonical row — deletion only actually happens once the
// LAST folder referencing a photo is gone. Candidate photo_ids from every
// expiring folder in this run are collected and orphan-checked together in
// one batch AFTER all of them are deleted, not one folder at a time — two
// folders expiring in the same run that both reference the same photo must
// both be gone before it's treated as orphaned, and checking per-folder
// inside the loop would incorrectly see it as "still linked" via the other
// one not yet processed.
//
// A person who ends up with zero folders left (every event they were
// shared photos for has expired) is removed too, along with their link.
async function cleanupExpiredShares() {
  const supabase = createAdminClient()
  const { data: expired, error } = await supabase
    .from('photo_share_folders').select('id, title, person_id').lte('expires_at', new Date().toISOString())
  if (error) throw new Error(error.message)

  let deletedFolders = 0
  const touchedPersonIds = new Set()
  const candidatePhotoIds = []
  for (const folder of (expired || [])) {
    const { data: links } = await supabase.from('photo_share_folder_items').select('photo_id').eq('folder_id', folder.id)
    // gallery_photo_submissions.photo_share_folder_id cascades away with this
    // folder too — any still-pending (never reviewed) upload's storage files
    // would otherwise leak forever, and the submission would silently vanish
    // from the admin review queue with no one ever having seen it. These
    // aren't part of the shared-photo system, so they're removed unconditionally.
    const { data: pendingSubmissions } = await supabase.from('gallery_photo_submissions').select('storage_path, original_path').eq('photo_share_folder_id', folder.id)
    const pendingPaths = [...new Set((pendingSubmissions || []).flatMap(i => [i.storage_path, i.original_path]).filter(Boolean))]
    if (pendingPaths.length) {
      const { error: removeErr } = await supabase.storage.from(BUCKET).remove(pendingPaths)
      if (removeErr) {
        captureException(new Error(removeErr.message), { context: 'photo-shares-cleanup-pending-storage', folderId: folder.id })
        continue // leave the DB row for next run rather than losing the file reference
      }
    }
    const { error: delErr } = await supabase.from('photo_share_folders').delete().eq('id', folder.id)
    if (delErr) { captureException(delErr, { context: 'photo-shares-cleanup-db', folderId: folder.id }); continue }
    deletedFolders++
    touchedPersonIds.add(folder.person_id)
    candidatePhotoIds.push(...(links || []).map(l => l.photo_id))
  }

  const { deletedIds: deletedPhotoIds } = await cleanupOrphanedPhotos(supabase, candidatePhotoIds)

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

  return { deletedFolders, deletedFiles: deletedPhotoIds.length, deletedPeople, totalExpired: (expired || []).length }
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
