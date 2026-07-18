import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../../lib/adminAudit.js'
import { captureException } from '../../../../../lib/sentry'

const BUCKET = 'gallery-photos'

export async function PATCH(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const { caption } = await request.json().catch(() => ({}))

  const supabase = createAdminClient()
  const { data: row, error } = await supabase.from('gallery_photos')
    .update({ caption: (caption || '').trim().slice(0, 300) || null })
    .eq('id', id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(row)
}

export async function DELETE(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: row } = await supabase.from('gallery_photos')
    .select('storage_path, album').eq('id', id).maybeSingle()
  if (!row) return Response.json({ error: 'Photo not found.' }, { status: 404 })

  const { error: delErr } = await supabase.from('gallery_photos').delete().eq('id', id)
  if (delErr) return Response.json({ error: delErr.message }, { status: 500 })

  if (row.storage_path) await supabase.storage.from(BUCKET).remove([row.storage_path]).catch(err =>
    captureException(err, { context: 'admin-gallery-photo-delete-storage', id }))

  await logAdminAction(supabase, adminUser?.email, { action: 'gallery.photo_delete', entityType: 'gallery_photo', entityId: id, entityName: row.album })
  return Response.json({ success: true })
}
