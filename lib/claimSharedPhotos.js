import { normalizeEmail } from './normalizeEmail'
import { captureException, captureMessage } from './sentry'

const SHARES_BUCKET = 'photo-shares'
const GALLERY_BUCKET = 'gallery-photos'

const extOf = path => {
  const e = (path || '').split('.').pop()?.toLowerCase()
  return /^[a-z0-9]{2,5}$/.test(e || '') ? e : 'jpg'
}

// When a non-member who was sent photos (photo_share_people/folders/items)
// becomes a member, permanently copy those photos into their own member
// gallery (gallery_photos, category 'personal') so they keep them forever —
// independent of the non-member share link's 30-day expiry (after which the
// cleanup cron deletes the source). Files are copied from the photo-shares
// bucket into the permanent gallery-photos bucket.
//
// Idempotent: the destination storage path embeds the source share-item id,
// and we skip any item already present for this member — so it can run at
// invite time AND again on the member's first photos-page view (the backfill
// path for members who joined before this existed) without duplicating.
//
// Best-effort by contract: callers should not let a failure here break member
// creation or the photos page — it reports to Sentry and returns a count.
export async function claimSharedPhotosForMember(admin, { memberId, email }) {
  const norm = normalizeEmail(email)
  if (!memberId || !norm) return { claimed: 0 }

  const { data: person } = await admin.from('photo_share_people').select('id').eq('email', norm).maybeSingle()
  if (!person) return { claimed: 0 }

  const { data: folders } = await admin.from('photo_share_folders')
    .select('id, title')
    .eq('person_id', person.id)
    .gt('expires_at', new Date().toISOString())
  if (!folders?.length) return { claimed: 0 }

  const folderTitleById = new Map(folders.map(f => [f.id, f.title]))
  const { data: items } = await admin.from('photo_share_items')
    .select('id, folder_id, storage_path, original_path')
    .in('folder_id', folders.map(f => f.id))
    .order('created_at', { ascending: true })
  if (!items?.length) return { claimed: 0 }

  // Already-claimed destination paths for this member — the idempotency gate.
  const { data: existing } = await admin.from('gallery_photos')
    .select('storage_path').eq('category', 'personal').eq('member_id', memberId)
  const have = new Set((existing || []).map(r => r.storage_path))

  let claimed = 0
  for (const it of items) {
    const dispDest = `personal/${memberId}/share-${it.id}-d.${extOf(it.storage_path)}`
    if (have.has(dispDest)) continue // already claimed on a prior run
    const origSrc = it.original_path || it.storage_path
    const origDest = `personal/${memberId}/share-${it.id}-o.${extOf(origSrc)}`

    try {
      // Cross-bucket server-side copies (no download) — display + original.
      const [dispCopy, origCopy] = await Promise.all([
        admin.storage.from(SHARES_BUCKET).copy(it.storage_path, dispDest, { destinationBucket: GALLERY_BUCKET }),
        admin.storage.from(SHARES_BUCKET).copy(origSrc, origDest, { destinationBucket: GALLERY_BUCKET }),
      ])
      if (dispCopy.error || origCopy.error) {
        captureMessage('claimSharedPhotos: storage copy failed', { memberId, itemId: it.id, dispErr: dispCopy.error?.message, origErr: origCopy.error?.message })
        continue
      }

      const { data: { publicUrl: photoUrl } } = admin.storage.from(GALLERY_BUCKET).getPublicUrl(dispDest)
      const { data: { publicUrl: originalUrl } } = admin.storage.from(GALLERY_BUCKET).getPublicUrl(origDest)

      const { error: insErr } = await admin.from('gallery_photos').insert({
        category: 'personal',
        member_id: memberId,
        caption: folderTitleById.get(it.folder_id) || null,
        photo_url: photoUrl,
        storage_path: dispDest,
        original_path: origDest,
        original_url: originalUrl,
      })
      if (insErr) {
        captureMessage('claimSharedPhotos: gallery insert failed', { memberId, itemId: it.id, error: insErr.message })
        // Roll back the just-copied files so a retry can re-copy cleanly.
        admin.storage.from(GALLERY_BUCKET).remove([dispDest, origDest]).catch(() => {})
        continue
      }
      have.add(dispDest)
      claimed++
    } catch (err) {
      captureException(err, { context: 'claim-shared-photos-item', memberId, itemId: it.id })
    }
  }
  return { claimed }
}
