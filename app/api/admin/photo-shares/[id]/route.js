import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../../lib/adminAudit.js'
import { captureException } from '../../../../../lib/sentry'

const BUCKET = 'photo-shares'

// Edit title/recipient reference fields, or push the expiry back out (e.g.
// the admin wants to give someone another 30 days before it's cleaned up).
export async function PATCH(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const update = {}
  if ('title' in body) {
    const title = (body.title || '').toString().trim()
    if (!title) return Response.json({ error: 'Title is required.' }, { status: 400 })
    update.title = title.slice(0, 120)
  }
  if ('recipientName' in body) update.recipient_name = (body.recipientName || '').toString().trim().slice(0, 120) || null
  if ('recipientEmail' in body) update.recipient_email = (body.recipientEmail || '').toString().trim().slice(0, 200) || null
  if (body.renew) update.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  if (!Object.keys(update).length) return Response.json({ error: 'Nothing to update.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('photo_shares').update(update).eq('id', id).select('*').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

// Deletes a share early (before its 30-day expiry) — removes the storage
// files first, then the DB rows (photo_share_items cascades).
export async function DELETE(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const supabase = createAdminClient()

  const { data: share } = await supabase.from('photo_shares').select('title').eq('id', id).maybeSingle()
  const { data: items } = await supabase.from('photo_share_items').select('storage_path').eq('share_id', id)

  const { error } = await supabase.from('photo_shares').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const paths = (items || []).map(i => i.storage_path).filter(Boolean)
  if (paths.length) {
    await supabase.storage.from(BUCKET).remove(paths).catch(err =>
      captureException(err, { context: 'admin-photo-share-delete-storage', shareId: id }))
  }

  await logAdminAction(supabase, adminUser?.email, { action: 'photo_share.delete', entityType: 'photo_share', entityId: id, entityName: share?.title })
  return Response.json({ success: true })
}
