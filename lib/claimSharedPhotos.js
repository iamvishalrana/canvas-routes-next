import { normalizeEmail } from './normalizeEmail'
import { captureException, captureMessage } from './sentry'
import { unlinkFolderItemAndCleanup } from './photoShareDedup'
import { getObjectBuffer } from './r2'

const SHARES_BUCKET = 'photo-shares'
const GALLERY_BUCKET = 'gallery-photos'

const extOf = path => {
  const e = (path || '').split('.').pop()?.toLowerCase()
  return /^[a-z0-9]{2,5}$/.test(e || '') ? e : 'jpg'
}

// When a non-member who was sent photos (photo_share_people/folders/items)
// becomes a member, MOVE those photos into their own member gallery
// (gallery_photos, category 'personal') so they own them permanently — and so
// they no longer appear on the temporary non-member share link. Files are
// copied from the photo-shares bucket into the permanent gallery-photos bucket,
// and only THEN is the source removed.
//
// Hard invariant: a source photo is never deleted unless its permanent copy is
// confirmed present in the member's gallery. If a copy fails, the source is
// left untouched and retried on the next run. So a photo can never be lost —
// worst case it stays on the share link until the next attempt.
//
// Idempotent: destination paths embed the source share-item id; an already-
// copied item (from a prior run) is not re-copied, but its source is still
// removed. Safe to run at invite time, on the member's photos-page view, and
// from the admin reclaim endpoint.
//
// Best-effort by contract: callers must not let a failure here break member
// creation or the photos page — it reports to Sentry and returns counts.
export async function claimSharedPhotosForMember(admin, { memberId, email }) {
  const norm = normalizeEmail(email)
  if (!memberId || !norm) return { claimed: 0, movedOut: 0 }

  const { data: person } = await admin.from('photo_share_people').select('id').eq('email', norm).maybeSingle()
  if (!person) return { claimed: 0, movedOut: 0 }

  const { data: folders } = await admin.from('photo_share_folders')
    .select('id, title')
    .eq('person_id', person.id)
    .gt('expires_at', new Date().toISOString())
  if (!folders?.length) return { claimed: 0, movedOut: 0 }

  const folderTitleById = new Map(folders.map(f => [f.id, f.title]))
  // A photo may be linked into several folders (a shared group shot) — this
  // still reads one row per LINK (not per canonical photo), same shape as
  // before, so the rest of this function is unaffected by that.
  const { data: links } = await admin.from('photo_share_folder_items')
    .select('id, folder_id, caption, photo:photo_share_photos(storage_path, original_path)')
    .in('folder_id', folders.map(f => f.id))
    .order('created_at', { ascending: true })
  const items = (links || [])
    .filter(l => l.photo)
    .map(l => ({ id: l.id, folder_id: l.folder_id, caption: l.caption, storage_path: l.photo.storage_path, original_path: l.photo.original_path }))
  if (!items?.length) return { claimed: 0, movedOut: 0 }

  // Destination paths already present for this member — the idempotency gate,
  // and the proof-of-copy that authorises removing a source.
  const { data: existing } = await admin.from('gallery_photos')
    .select('storage_path').eq('category', 'personal').eq('member_id', memberId)
  const have = new Set((existing || []).map(r => r.storage_path))

  let claimed = 0
  let movedOut = 0
  const touchedFolderIds = new Set()

  for (const it of items) {
    const dispDest = `personal/${memberId}/share-${it.id}-d.${extOf(it.storage_path)}`
    const origSrc = it.original_path || it.storage_path
    const origDest = `personal/${memberId}/share-${it.id}-o.${extOf(origSrc)}`
    let copyConfirmed = have.has(dispDest) // already copied on a prior run

    if (!copyConfirmed) {
      try {
        // photo-shares now lives on R2, gallery-photos is still on Supabase
        // Storage (phased migration) — a cross-provider move can't be a single
        // native storage-to-storage copy, so download from R2 then upload to
        // Supabase. Once gallery-photos also moves to R2 this should go back
        // to a native same-provider copyObject() (see lib/r2.js) instead.
        const [dispObj, origObj] = await Promise.all([
          getObjectBuffer({ bucket: SHARES_BUCKET, path: it.storage_path }),
          getObjectBuffer({ bucket: SHARES_BUCKET, path: origSrc }),
        ])
        const [dispUpload, origUpload] = await Promise.all([
          admin.storage.from(GALLERY_BUCKET).upload(dispDest, dispObj.buffer, { contentType: dispObj.contentType }),
          admin.storage.from(GALLERY_BUCKET).upload(origDest, origObj.buffer, { contentType: origObj.contentType }),
        ])
        if (dispUpload.error || origUpload.error) {
          captureMessage('claimSharedPhotos: storage copy failed', { memberId, itemId: it.id, dispErr: dispUpload.error?.message, origErr: origUpload.error?.message })
          continue // leave the source in place; retry next run
        }
        const { data: { publicUrl: photoUrl } } = admin.storage.from(GALLERY_BUCKET).getPublicUrl(dispDest)
        const { data: { publicUrl: originalUrl } } = admin.storage.from(GALLERY_BUCKET).getPublicUrl(origDest)
        const { error: insErr } = await admin.from('gallery_photos').insert({
          category: 'personal',
          member_id: memberId,
          // Carry the non-member folder over as the member's personal folder
          // (album), and keep each photo's own caption — previously the folder
          // title was stuffed into caption and the folder structure was lost.
          album: folderTitleById.get(it.folder_id) || null,
          caption: it.caption || null,
          photo_url: photoUrl,
          storage_path: dispDest,
          original_path: origDest,
          original_url: originalUrl,
        })
        if (insErr) {
          captureMessage('claimSharedPhotos: gallery insert failed', { memberId, itemId: it.id, error: insErr.message })
          // Roll back the just-copied files so a retry can re-copy cleanly.
          admin.storage.from(GALLERY_BUCKET).remove([dispDest, origDest]).catch(() => {})
          continue // source untouched
        }
        have.add(dispDest)
        claimed++
        copyConfirmed = true
      } catch (err) {
        captureException(err, { context: 'claim-shared-photos-copy', memberId, itemId: it.id })
        continue // source untouched
      }
    }

    // Copy is confirmed in the member's gallery → safe to remove this
    // person's LINK to the source photo so it stops appearing on their
    // non-member share link. Reached ONLY when copyConfirmed is true. If the
    // same photo is also linked into someone else's still-active folder (a
    // shared group shot), unlinkFolderItemAndCleanup leaves the source
    // storage file and canonical row in place for them — only actually
    // deleted once no folder anywhere still references it.
    if (copyConfirmed) {
      try {
        await unlinkFolderItemAndCleanup(admin, { linkId: it.id })
        movedOut++; touchedFolderIds.add(it.folder_id)
      } catch (err) {
        captureException(err, { context: 'claim-shared-photos-source-delete', itemId: it.id })
      }
    }
  }

  // Tidy up folders that are now fully moved out (no items AND no pending
  // uploads left to review), and the person if they have no folders left — so
  // the non-member link doesn't linger as an empty shell. Mirrors the
  // photo-shares-cleanup cron. Wrapped so a cleanup hiccup never undoes the move.
  try {
    for (const folderId of touchedFolderIds) {
      const [{ count: itemsLeft }, { count: subsLeft }] = await Promise.all([
        admin.from('photo_share_folder_items').select('id', { count: 'exact', head: true }).eq('folder_id', folderId),
        admin.from('gallery_photo_submissions').select('id', { count: 'exact', head: true }).eq('photo_share_folder_id', folderId),
      ])
      if ((itemsLeft ?? 0) === 0 && (subsLeft ?? 0) === 0) {
        const { error } = await admin.from('photo_share_folders').delete().eq('id', folderId)
        if (error) captureMessage('claimSharedPhotos: folder delete failed', { folderId, error: error.message })
      }
    }
    const { count: foldersLeft } = await admin.from('photo_share_folders').select('id', { count: 'exact', head: true }).eq('person_id', person.id)
    if ((foldersLeft ?? 0) === 0) {
      await admin.from('photo_share_people').delete().eq('id', person.id)
    }
  } catch (err) {
    captureException(err, { context: 'claim-shared-photos-cleanup', memberId })
  }

  return { claimed, movedOut }
}
