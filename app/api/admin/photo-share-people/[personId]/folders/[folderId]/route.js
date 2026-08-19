import { createAdminClient } from '../../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../../../../lib/adminAudit.js'
import { captureException } from '../../../../../../../lib/sentry'
import { cleanupOrphanedPhotos } from '../../../../../../../lib/photoShareDedup'

const BUCKET = 'photo-shares'

// Folder details + its photos — the folder page's single load. Each photo
// may be linked into other people's folders too (a shared group shot) —
// `sharedWith` surfaces that so it's never a silent black box in the admin
// panel. See lib/photoShareDedup.js for how the linking/dedup itself works.
export async function GET(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { personId, folderId } = await params
  const supabase = createAdminClient()

  const { data: folder, error } = await supabase.from('photo_share_folders').select('*').eq('id', folderId).eq('person_id', personId).maybeSingle()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!folder) return Response.json({ error: 'Not found.' }, { status: 404 })

  const { data: links } = await supabase.from('photo_share_folder_items')
    .select('id, photo_id, caption, created_at').eq('folder_id', folderId).order('created_at', { ascending: true })

  const photoIds = [...new Set((links || []).map(l => l.photo_id))]
  const { data: photos } = photoIds.length
    ? await supabase.from('photo_share_photos').select('id, storage_path, original_path').in('id', photoIds)
    : { data: [] }
  const photoById = new Map((photos || []).map(p => [p.id, p]))

  // Every OTHER folder (i.e. other person) linking to any of these same
  // photos — powers the "also in: X" indicator.
  const { data: otherLinks } = photoIds.length
    ? await supabase.from('photo_share_folder_items').select('photo_id, folder_id').in('photo_id', photoIds).neq('folder_id', folderId)
    : { data: [] }
  const otherFolderIds = [...new Set((otherLinks || []).map(l => l.folder_id))]
  const { data: otherFolders } = otherFolderIds.length
    ? await supabase.from('photo_share_folders').select('id, title, person_id').in('id', otherFolderIds)
    : { data: [] }
  const otherPersonIds = [...new Set((otherFolders || []).map(f => f.person_id))]
  const { data: otherPeople } = otherPersonIds.length
    ? await supabase.from('photo_share_people').select('id, name, email').in('id', otherPersonIds)
    : { data: [] }
  const personById = new Map((otherPeople || []).map(p => [p.id, p]))
  const otherFolderById = new Map((otherFolders || []).map(f => [f.id, f]))

  const sharedWithByPhoto = new Map()
  for (const l of (otherLinks || [])) {
    const f = otherFolderById.get(l.folder_id)
    if (!f) continue
    const person = personById.get(f.person_id)
    if (!sharedWithByPhoto.has(l.photo_id)) sharedWithByPhoto.set(l.photo_id, [])
    sharedWithByPhoto.get(l.photo_id).push({ personName: person?.name || person?.email || 'Unknown', personId: f.person_id, folderTitle: f.title })
  }

  const photosOut = (links || []).flatMap(link => {
    const photo = photoById.get(link.photo_id)
    if (!photo) return [] // canonical row missing (shouldn't happen) — drop rather than 500 the whole folder
    const { data: { publicUrl: url } } = supabase.storage.from(BUCKET).getPublicUrl(photo.storage_path)
    const { data: { publicUrl: originalUrl } } = supabase.storage.from(BUCKET).getPublicUrl(photo.original_path || photo.storage_path)
    return [{
      id: link.id, photo_id: photo.id, folder_id: folderId, caption: link.caption, created_at: link.created_at,
      url, originalUrl, sharedWith: sharedWithByPhoto.get(photo.id) || [],
    }]
  })

  return Response.json({ ...folder, photos: photosOut })
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
  // Any change to the expiry re-arms the 3-day "removed soon" reminder — so a
  // renewed/extended folder gets a fresh reminder before its new expiry, and a
  // folder wound down early can still warn the recipient before it's removed.
  if ('expires_at' in update) update.reminder_sent_at = null

  if (!Object.keys(update).length) return Response.json({ error: 'Nothing to update.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('photo_share_folders').update(update).eq('id', folderId).eq('person_id', personId).select('*').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

// Deletes a folder early (before its 30-day expiry). Its photo LINKS cascade
// away with it, but the underlying photos themselves are only actually
// deleted (storage + canonical row) if no other folder still links to them
// — see lib/photoShareDedup.js#cleanupOrphanedPhotos. Pending (not-yet-
// published) submission uploads aren't part of the shared-photo system, so
// they're still removed unconditionally, same as before.
export async function DELETE(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { personId, folderId } = await params
  const supabase = createAdminClient()

  const { data: folder } = await supabase.from('photo_share_folders').select('title').eq('id', folderId).eq('person_id', personId).maybeSingle()
  if (!folder) return Response.json({ error: 'Not found.' }, { status: 404 })
  const { data: links } = await supabase.from('photo_share_folder_items').select('photo_id').eq('folder_id', folderId)
  const photoIds = (links || []).map(l => l.photo_id)
  // gallery_photo_submissions.photo_share_folder_id also cascades on this
  // folder's deletion — read out any still-pending upload's storage paths
  // now or they leak forever.
  const { data: pendingSubmissions } = await supabase.from('gallery_photo_submissions').select('storage_path, original_path').eq('photo_share_folder_id', folderId)

  const { error } = await supabase.from('photo_share_folders').delete().eq('id', folderId).eq('person_id', personId)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await cleanupOrphanedPhotos(supabase, photoIds).catch(err =>
    captureException(err, { context: 'admin-photo-share-folder-delete-cleanup', folderId }))

  const pendingPaths = [...new Set((pendingSubmissions || []).flatMap(i => [i.storage_path, i.original_path]).filter(Boolean))]
  if (pendingPaths.length) {
    await supabase.storage.from(BUCKET).remove(pendingPaths).catch(err =>
      captureException(err, { context: 'admin-photo-share-folder-delete-pending-storage', folderId }))
  }

  await logAdminAction(supabase, adminUser?.email, { action: 'photo_share_folder.delete', entityType: 'photo_share_folder', entityId: folderId, entityName: folder?.title })
  return Response.json({ success: true })
}
