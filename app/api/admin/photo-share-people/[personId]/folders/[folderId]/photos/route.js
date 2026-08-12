import { createAdminClient } from '../../../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../../../lib/supabase/authCheck'
import { captureException } from '../../../../../../../../lib/sentry'
import { ALLOWED_EXTS } from '../../../../../../../../lib/allowedImageTypes'

const BUCKET = 'photo-shares'

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
  return Response.json({ ...row, url, originalUrl })
}
