// Shared logic for the photo-share dedup feature: the same physical photo
// (e.g. a group shot admin uploads once for several attendees) can be
// linked into multiple people's folders instead of stored as a separate
// copy per person. See supabase/migrations/20260819_photo_share_shared_photos.sql
// for the schema this operates on (photo_share_photos = one row per actual
// file; photo_share_folder_items = one row per folder a photo is linked
// into, each with its own caption).
//
// Every call site that removes a folder-photo link (single-photo delete,
// whole-folder delete, whole-person delete, member claim, the daily expiry
// cron) must route through unlinkFolderItemAndCleanup or
// cleanupOrphanedPhotos rather than deleting photo_share_photos/storage
// directly — that's what guarantees a shared photo only actually gets
// deleted once the LAST folder referencing it is gone, not the first.
import { captureException } from './sentry'

const BUCKET = 'photo-shares'

// Looks for an already-uploaded photo matching this exact file content,
// scoped to folders sharing the same title (the admin's event-name
// grouping) — never a global match, so a coincidentally-identical photo
// from a completely unrelated event never gets linked in. Returns the
// matching photo_share_photos row, or null if nothing matches (including
// when contentHash is falsy — a missing hash must never match anything).
export async function findExistingSharedPhoto(admin, { contentHash, folderTitle }) {
  if (!contentHash || !folderTitle) return null
  const { data } = await admin.from('photo_share_photos')
    .select('id, storage_path, original_path')
    .eq('content_hash', contentHash).eq('folder_title', folderTitle).maybeSingle()
  return data || null
}

// Creates a brand-new canonical photo row plus its first folder link — the
// "not a duplicate" path, used right after the browser uploads both files
// to storage.
export async function createSharedPhotoAndLink(admin, { folderId, storagePath, originalPath, contentHash, folderTitle, caption }) {
  const { data: photo, error: photoErr } = await admin.from('photo_share_photos')
    .insert({ storage_path: storagePath, original_path: originalPath, content_hash: contentHash || null, folder_title: folderTitle })
    .select('*').single()
  if (photoErr) throw photoErr

  const { data: link, error: linkErr } = await admin.from('photo_share_folder_items')
    .insert({ folder_id: folderId, photo_id: photo.id, caption: caption || null })
    .select('*').single()
  if (linkErr) throw linkErr

  return { photo, link }
}

// Links an already-existing canonical photo (found via findExistingSharedPhoto)
// into another folder — the "duplicate, skip the re-upload" path.
export async function linkExistingPhoto(admin, { folderId, photoId, caption }) {
  const { data: link, error } = await admin.from('photo_share_folder_items')
    .insert({ folder_id: folderId, photo_id: photoId, caption: caption || null })
    .select('*').single()
  if (error) throw error
  return link
}

// Removes ONE folder's link to a photo (e.g. admin deletes a single photo
// from one person's folder), then deletes the underlying storage files and
// canonical photo row ONLY if no other folder still links to it. Safe to
// call even if the link is already gone (no-ops).
export async function unlinkFolderItemAndCleanup(admin, { linkId }) {
  const { data: link } = await admin.from('photo_share_folder_items').select('id, photo_id').eq('id', linkId).maybeSingle()
  if (!link) return { deletedPhoto: false }

  const { error: delLinkErr } = await admin.from('photo_share_folder_items').delete().eq('id', linkId)
  if (delLinkErr) throw delLinkErr

  const result = await cleanupOrphanedPhotos(admin, [link.photo_id])
  return { deletedPhoto: result.deletedIds.includes(link.photo_id) }
}

// Given a list of candidate photo_ids (their folder links may already be
// gone, e.g. cascaded away by a folder/person delete), deletes the storage
// files + canonical photo_share_photos row for every one that has ZERO
// remaining folder links. Photos that still have at least one other active
// link are left completely untouched — this is what lets a shared photo
// survive when only some of the folders referencing it have expired.
//
// Mirrors the storage-before-DB-row ordering the cleanup cron already used
// pre-sharing: if storage removal fails, the photo_share_photos row is left
// in place (still orphaned, so it's picked up again on the next run)
// instead of losing track of a file that's still actually on disk.
export async function cleanupOrphanedPhotos(admin, photoIds) {
  const uniqueIds = [...new Set((photoIds || []).filter(Boolean))]
  const deletedIds = []
  if (!uniqueIds.length) return { deletedIds }

  const { data: stillLinked } = await admin.from('photo_share_folder_items')
    .select('photo_id').in('photo_id', uniqueIds)
  const linkedSet = new Set((stillLinked || []).map(r => r.photo_id))
  const orphanIds = uniqueIds.filter(id => !linkedSet.has(id))
  if (!orphanIds.length) return { deletedIds }

  const { data: orphanPhotos } = await admin.from('photo_share_photos')
    .select('id, storage_path, original_path').in('id', orphanIds)

  for (const photo of (orphanPhotos || [])) {
    const paths = [...new Set([photo.storage_path, photo.original_path].filter(Boolean))]
    try {
      if (paths.length) {
        const { error: removeErr } = await admin.storage.from(BUCKET).remove(paths)
        if (removeErr) throw removeErr
      }
      const { error: delErr } = await admin.from('photo_share_photos').delete().eq('id', photo.id)
      if (delErr) throw delErr
      deletedIds.push(photo.id)
    } catch (err) {
      captureException(err, { context: 'photo-share-orphan-cleanup', photoId: photo.id })
      // Leave the row in place — retried on the next call/cron run.
    }
  }
  return { deletedIds }
}
