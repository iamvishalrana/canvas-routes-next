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
  const { caption, tags } = await request.json().catch(() => ({}))

  const supabase = createAdminClient()
  const updates = {}
  if (caption !== undefined) updates.caption = (caption || '').trim().slice(0, 300) || null

  let row
  if (Object.keys(updates).length) {
    const { data, error } = await supabase.from('gallery_photos').update(updates).eq('id', id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    row = data
  } else {
    const { data, error } = await supabase.from('gallery_photos').select('*').eq('id', id).single()
    if (error) return Response.json({ error: error.message }, { status: 500 })
    row = data
  }

  // Tags only apply to event-category photos — replace the full set each time
  if (Array.isArray(tags) && row.category === 'event') {
    const memberIds = [...new Set(tags.filter(Boolean))]
    const { error: delErr } = await supabase.from('gallery_photo_tags').delete().eq('photo_id', id)
    if (delErr) return Response.json({ error: delErr.message }, { status: 500 })
    if (memberIds.length) {
      const { error: insErr } = await supabase.from('gallery_photo_tags')
        .insert(memberIds.map(memberId => ({ photo_id: id, member_id: memberId })))
      if (insErr) return Response.json({ error: insErr.message }, { status: 500 })
    }
  }

  return Response.json(row)
}

export async function DELETE(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: row } = await supabase.from('gallery_photos')
    .select('storage_path, original_path, album').eq('id', id).maybeSingle()
  if (!row) return Response.json({ error: 'Photo not found.' }, { status: 404 })

  const { error: delErr } = await supabase.from('gallery_photos').delete().eq('id', id)
  if (delErr) return Response.json({ error: delErr.message }, { status: 500 })

  const paths = [row.storage_path, row.original_path].filter(Boolean)
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths).catch(err =>
    captureException(err, { context: 'admin-gallery-photo-delete-storage', id }))

  await logAdminAction(supabase, adminUser?.email, { action: 'gallery.photo_delete', entityType: 'gallery_photo', entityId: id, entityName: row.album })
  return Response.json({ success: true })
}
