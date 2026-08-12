import { createAdminClient } from '../../../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../../../lib/supabase/authCheck'
import { captureException } from '../../../../../../../../lib/sentry'
import { ALLOWED_EXTS, ALLOWED_MIME_TYPES } from '../../../../../../../../lib/allowedImageTypes'

const BUCKET = 'photo-shares'
const GALLERY_BUCKET = 'gallery-photos'

function pathRegexFor(personId, folderId) {
  return new RegExp(`^${personId}/${folderId}/(originals|display)/[\\w-]+\\.(${ALLOWED_EXTS.join('|')})$`)
}

// Records a photo after the admin browser has uploaded both the original
// and a pre-compressed display copy directly to the photo-shares bucket via
// signed upload URLs (see ./upload-url).
export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { personId, folderId } = await params

  const { originalPath, displayPath } = await request.json().catch(() => ({}))
  const re = pathRegexFor(personId, folderId)
  if (!re.test(originalPath || '') || !re.test(displayPath || '')) {
    return Response.json({ error: 'Invalid storage path.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: folder } = await supabase.from('photo_share_folders').select('id').eq('id', folderId).eq('person_id', personId).maybeSingle()
  if (!folder) return Response.json({ error: 'Folder not found.' }, { status: 404 })

  const [{ data: origExists }, { data: dispExists }] = await Promise.all([
    supabase.storage.from(BUCKET).exists(originalPath),
    supabase.storage.from(BUCKET).exists(displayPath),
  ])
  if (!origExists || !dispExists) return Response.json({ error: 'Upload incomplete — please retry.' }, { status: 400 })

  const { data: row, error } = await supabase.from('photo_share_items')
    .insert({ folder_id: folderId, storage_path: displayPath, original_path: originalPath }).select('*').single()
  if (error) {
    captureException(error, { context: 'admin-photo-share-item-insert', folderId })
    return Response.json({ error: 'Photo uploaded but could not be saved. Please try again.' }, { status: 500 })
  }

  const { data: { publicUrl: url } } = supabase.storage.from(BUCKET).getPublicUrl(displayPath)
  const { data: { publicUrl: originalUrl } } = supabase.storage.from(BUCKET).getPublicUrl(originalPath)

  await mirrorIntoMembersGallery(supabase, { personId, folderId, originalPath, displayPath })

  return Response.json({ ...row, url, originalUrl })
}

// Copies this photo into the permanent gallery-photos bucket/table, tagged
// with the recipient's email instead of a member_id — they aren't a member
// yet. photo_share_folders auto-expire and get deleted by the
// photo-shares-cleanup cron 30 days after creation, so without this copy the
// photo would be gone before the person could ever see it again if they
// later join as a member. Claimed (member_id set, pending_email cleared) at
// invite time in app/api/admin/members POST. Best-effort: a mirror failure
// must never break the actual non-member upload/delivery flow.
async function mirrorIntoMembersGallery(supabase, { personId, folderId, originalPath, displayPath }) {
  try {
    const { data: person } = await supabase.from('photo_share_people').select('email').eq('id', personId).maybeSingle()
    if (!person?.email) return

    const bucketOpts = { public: true, allowedMimeTypes: ALLOWED_MIME_TYPES, fileSizeLimit: '100MB' }
    await supabase.storage.createBucket(GALLERY_BUCKET, bucketOpts).catch(() =>
      supabase.storage.updateBucket(GALLERY_BUCKET, bucketOpts).catch(() => {}))

    const base = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
    const galleryOriginalPath = `originals/${base}.${originalPath.split('.').pop()}`
    const galleryDisplayPath = `display/${base}.${displayPath.split('.').pop()}`

    const [origCopy, dispCopy] = await Promise.all([
      supabase.storage.from(BUCKET).copy(originalPath, galleryOriginalPath, { destinationBucket: GALLERY_BUCKET }),
      supabase.storage.from(BUCKET).copy(displayPath, galleryDisplayPath, { destinationBucket: GALLERY_BUCKET }),
    ])
    if (origCopy.error || dispCopy.error) {
      captureException(new Error(origCopy.error?.message || dispCopy.error?.message || 'gallery mirror copy failed'), { context: 'photo-share-gallery-mirror-copy', folderId })
      return
    }

    const { data: { publicUrl: galleryOriginalUrl } } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(galleryOriginalPath)
    const { data: { publicUrl: galleryDisplayUrl } } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(galleryDisplayPath)

    const { error: pendingErr } = await supabase.from('gallery_photos').insert({
      category: 'personal',
      pending_email: person.email,
      photo_url: galleryDisplayUrl,
      storage_path: galleryDisplayPath,
      original_path: galleryOriginalPath,
      original_url: galleryOriginalUrl,
    })
    if (pendingErr) captureException(pendingErr, { context: 'photo-share-gallery-mirror-insert', folderId })
  } catch (err) {
    captureException(err, { context: 'photo-share-gallery-mirror', folderId })
  }
}
