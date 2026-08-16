import { createAdminClient } from '../../../../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../../../../lib/supabase/authCheck'
import { captureException } from '../../../../../../../../../lib/sentry'

const BUCKET = 'photo-shares'

// Edit a non-member photo's caption (shown on their gallery). Verifies the
// photo belongs to this person's folder before writing.
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

  const { data, error } = await supabase.from('photo_share_items')
    .update({ caption }).eq('id', photoId).eq('folder_id', folderId).select('id, caption').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { personId, folderId, photoId } = await params
  const supabase = createAdminClient()

  const { data: folder } = await supabase.from('photo_share_folders').select('id').eq('id', folderId).eq('person_id', personId).maybeSingle()
  if (!folder) return Response.json({ error: 'Folder not found.' }, { status: 404 })

  const { data: row } = await supabase.from('photo_share_items').select('storage_path, original_path').eq('id', photoId).eq('folder_id', folderId).maybeSingle()
  if (!row) return Response.json({ error: 'Photo not found.' }, { status: 404 })

  const { error } = await supabase.from('photo_share_items').delete().eq('id', photoId)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const paths = [...new Set([row.storage_path, row.original_path].filter(Boolean))]
  if (paths.length) {
    await supabase.storage.from(BUCKET).remove(paths).catch(err =>
      captureException(err, { context: 'admin-photo-share-item-delete-storage', photoId }))
  }
  return Response.json({ success: true })
}
