import { createAdminClient } from '../../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../../../../lib/adminAudit.js'
import { captureException } from '../../../../../../../lib/sentry'

const BUCKET = 'photo-shares'

// Folder details + its photos — the folder page's single load.
export async function GET(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { personId, folderId } = await params
  const supabase = createAdminClient()

  const { data: folder, error } = await supabase.from('photo_share_folders').select('*').eq('id', folderId).eq('person_id', personId).maybeSingle()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!folder) return Response.json({ error: 'Not found.' }, { status: 404 })

  const { data: items } = await supabase.from('photo_share_items')
    .select('*').eq('folder_id', folderId).order('created_at', { ascending: true })

  const photos = (items || []).map(item => {
    const { data: { publicUrl: url } } = supabase.storage.from(BUCKET).getPublicUrl(item.storage_path)
    const { data: { publicUrl: originalUrl } } = supabase.storage.from(BUCKET).getPublicUrl(item.original_path || item.storage_path)
    return { ...item, url, originalUrl }
  })

  return Response.json({ ...folder, photos })
}

// Rename the folder, push its expiry out another 30 days, or set it to an
// exact admin-chosen date — either further out or sooner than today, so a
// folder can be extended or wound down early without deleting it outright.
const MAX_EXPIRY_YEARS_OUT = 3

export async function PATCH(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { personId, folderId } = await params
  const body = await request.json().catch(() => ({}))

  const update = {}
  if ('title' in body) {
    const title = (body.title || '').toString().trim()
    if (!title) return Response.json({ error: 'Title is required.' }, { status: 400 })
    update.title = title.slice(0, 120)
  }
  if (body.renew) {
    update.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  } else if ('expiresAt' in body) {
    const parsed = new Date(body.expiresAt)
    const maxOut = new Date(Date.now() + MAX_EXPIRY_YEARS_OUT * 365 * 24 * 60 * 60 * 1000)
    if (Number.isNaN(parsed.getTime())) return Response.json({ error: 'Invalid date.' }, { status: 400 })
    if (parsed > maxOut) return Response.json({ error: `Can't set an expiry more than ${MAX_EXPIRY_YEARS_OUT} years out.` }, { status: 400 })
    update.expires_at = parsed.toISOString()
  }
  if (!Object.keys(update).length) return Response.json({ error: 'Nothing to update.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('photo_share_folders').update(update).eq('id', folderId).eq('person_id', personId).select('*').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

// Deletes a folder early (before its 30-day expiry) — removes storage files
// first, then the DB rows (photo_share_items cascades).
export async function DELETE(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { personId, folderId } = await params
  const supabase = createAdminClient()

  const { data: folder } = await supabase.from('photo_share_folders').select('title').eq('id', folderId).eq('person_id', personId).maybeSingle()
  if (!folder) return Response.json({ error: 'Not found.' }, { status: 404 })
  const { data: items } = await supabase.from('photo_share_items').select('storage_path, original_path').eq('folder_id', folderId)

  const { error } = await supabase.from('photo_share_folders').delete().eq('id', folderId).eq('person_id', personId)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const paths = [...new Set((items || []).flatMap(i => [i.storage_path, i.original_path]).filter(Boolean))]
  if (paths.length) {
    await supabase.storage.from(BUCKET).remove(paths).catch(err =>
      captureException(err, { context: 'admin-photo-share-folder-delete-storage', folderId }))
  }

  await logAdminAction(supabase, adminUser?.email, { action: 'photo_share_folder.delete', entityType: 'photo_share_folder', entityId: folderId, entityName: folder?.title })
  return Response.json({ success: true })
}
