import { createAdminClient } from '../../../../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../../../../lib/supabase/authCheck'
import { captureException } from '../../../../../../../../../lib/sentry'
import { unlinkFolderItemAndCleanup } from '../../../../../../../../../lib/photoShareDedup'

// `photoId` in this route's URL is actually a photo_share_folder_items LINK
// id (kept as-is to avoid a client route-shape change) — captions are
// per-folder-link, not per-photo, since two different people's folders can
// share the same underlying photo but reasonably want different captions.

// Edit a non-member photo's caption (shown on their gallery). Verifies the
// link belongs to this person's folder before writing.
export async function PATCH(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { personId, folderId, photoId } = await params
  const body = await request.json().catch(() => ({}))
  if (!('caption' in body)) return Response.json({ error: 'Nothing to update.' }, { status: 400 })
  const caption = (body.caption ?? '').toString().trim().slice(0, 300) || null

  const supabase = createAdminClient()
  const { data: folder } = await supabase.from('photo_share_folders').select('id').eq('id', folderId).eq('person_id', personId).maybeSingle()
  if (!folder) return Response.json({ error: 'Folder not found.' }, { status: 404 })

  const { data, error } = await supabase.from('photo_share_folder_items')
    .update({ caption }).eq('id', photoId).eq('folder_id', folderId).select('id, caption').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

// Removes this photo from just this one person's folder. If the same photo
// is still linked into any other folder (shared group shot), the storage
// files and canonical photo row are left alone — see
// lib/photoShareDedup.js#unlinkFolderItemAndCleanup for the actual
// last-reference check.
export async function DELETE(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { personId, folderId, photoId } = await params
  const supabase = createAdminClient()

  const { data: folder } = await supabase.from('photo_share_folders').select('id').eq('id', folderId).eq('person_id', personId).maybeSingle()
  if (!folder) return Response.json({ error: 'Folder not found.' }, { status: 404 })

  const { data: link } = await supabase.from('photo_share_folder_items').select('id').eq('id', photoId).eq('folder_id', folderId).maybeSingle()
  if (!link) return Response.json({ error: 'Photo not found.' }, { status: 404 })

  try {
    await unlinkFolderItemAndCleanup(supabase, { linkId: photoId })
  } catch (err) {
    captureException(err, { context: 'admin-photo-share-item-delete', photoId })
    return Response.json({ error: 'Failed to delete photo.' }, { status: 500 })
  }
  return Response.json({ success: true })
}
