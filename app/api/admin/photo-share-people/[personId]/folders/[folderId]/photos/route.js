import { createAdminClient } from '../../../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../../../lib/supabase/authCheck'
import { captureException } from '../../../../../../../../lib/sentry'
import { ALLOWED_EXTS } from '../../../../../../../../lib/allowedImageTypes'
import { createSharedPhotoAndLink, linkExistingPhoto } from '../../../../../../../../lib/photoShareDedup'

const BUCKET = 'photo-shares'

function pathRegexFor(personId, folderId) {
  return new RegExp(`^${personId}/${folderId}/(originals|display)/[\\w-]+\\.(${ALLOWED_EXTS.join('|')})$`)
}

// Records a photo after the admin browser has uploaded both the original
// and a pre-compressed display copy directly to the photo-shares bucket via
// signed upload URLs (see ./upload-url) — OR, if ./upload-url already found
// a byte-identical photo uploaded under a same-titled folder, just links
// that existing photo in (body carries `photoId` instead of the two paths,
// and nothing was uploaded to storage for this request at all).
export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { personId, folderId } = await params
  const supabase = createAdminClient()

  const body = await request.json().catch(() => ({}))

  const { data: folder } = await supabase.from('photo_share_folders').select('id, title').eq('id', folderId).eq('person_id', personId).maybeSingle()
  if (!folder) return Response.json({ error: 'Folder not found.' }, { status: 404 })

  let photoRow, linkRow
  try {
    if (body.photoId) {
      const { data: photo } = await supabase.from('photo_share_photos').select('*').eq('id', body.photoId).maybeSingle()
      if (!photo) return Response.json({ error: 'Photo not found.' }, { status: 404 })
      photoRow = photo
      linkRow = await linkExistingPhoto(supabase, { folderId, photoId: photo.id, caption: body.caption })
    } else {
      const { originalPath, displayPath, contentHash } = body
      const re = pathRegexFor(personId, folderId)
      if (!re.test(originalPath || '') || !re.test(displayPath || '')) {
        return Response.json({ error: 'Invalid storage path.' }, { status: 400 })
      }
      const [{ data: origExists }, { data: dispExists }] = await Promise.all([
        supabase.storage.from(BUCKET).exists(originalPath),
        supabase.storage.from(BUCKET).exists(displayPath),
      ])
      if (!origExists || !dispExists) return Response.json({ error: 'Upload incomplete — please retry.' }, { status: 400 })

      const created = await createSharedPhotoAndLink(supabase, {
        folderId, storagePath: displayPath, originalPath, contentHash, folderTitle: folder.title, caption: body.caption,
      })
      photoRow = created.photo
      linkRow = created.link
    }
  } catch (error) {
    captureException(error, { context: 'admin-photo-share-item-insert', folderId })
    return Response.json({ error: 'Photo uploaded but could not be saved. Please try again.' }, { status: 500 })
  }

  const { data: { publicUrl: url } } = supabase.storage.from(BUCKET).getPublicUrl(photoRow.storage_path)
  const { data: { publicUrl: originalUrl } } = supabase.storage.from(BUCKET).getPublicUrl(photoRow.original_path)
  return Response.json({ id: linkRow.id, photo_id: photoRow.id, folder_id: folderId, caption: linkRow.caption, created_at: linkRow.created_at, url, originalUrl, sharedWith: [] })
}
