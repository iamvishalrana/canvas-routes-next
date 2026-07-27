import { createAdminClient } from '../../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../../lib/supabase/authCheck'
import { captureException } from '../../../../../../../lib/sentry'

const BUCKET = 'photo-shares'

export async function DELETE(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { photoId } = await params
  const supabase = createAdminClient()

  const { data: row } = await supabase.from('photo_share_items').select('storage_path, original_path').eq('id', photoId).maybeSingle()
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
