import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../../lib/adminAudit.js'
import { captureException } from '../../../../../lib/sentry'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'

const BUCKET = 'photo-shares'

// Person details + their folders (with photo counts) — the person page's
// single load.
export async function GET(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { personId } = await params
  const supabase = createAdminClient()

  const { data: person, error } = await supabase.from('photo_share_people').select('*').eq('id', personId).maybeSingle()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!person) return Response.json({ error: 'Not found.' }, { status: 404 })

  const { data: folders } = await supabase.from('photo_share_folders')
    .select('*').eq('person_id', personId).order('created_at', { ascending: false })
  const { data: items } = await supabase.from('photo_share_items')
    .select('folder_id').in('folder_id', (folders || []).map(f => f.id))

  const countByFolder = new Map()
  for (const i of (items || [])) countByFolder.set(i.folder_id, (countByFolder.get(i.folder_id) || 0) + 1)

  return Response.json({
    ...person,
    folders: (folders || []).map(f => ({ ...f, photoCount: countByFolder.get(f.id) || 0 })),
  })
}

export async function PATCH(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { personId } = await params
  const body = await request.json().catch(() => ({}))

  const update = {}
  if ('name' in body) update.name = (body.name || '').toString().trim().slice(0, 120) || null
  if ('email' in body) {
    const email = normalizeEmail(body.email).slice(0, 200)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'A valid email is required.' }, { status: 400 })
    update.email = email
  }
  if (!Object.keys(update).length) return Response.json({ error: 'Nothing to update.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('photo_share_people').update(update).eq('id', personId).select('*').single()
  if (error) {
    if (error.code === '23505') return Response.json({ error: 'Another person already uses that email.' }, { status: 409 })
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json(data)
}

// Deletes a person and everything underneath them — every folder, every
// photo, and every storage file across all of it.
export async function DELETE(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { personId } = await params
  const supabase = createAdminClient()

  const { data: person } = await supabase.from('photo_share_people').select('name, email').eq('id', personId).maybeSingle()
  const { data: folders } = await supabase.from('photo_share_folders').select('id').eq('person_id', personId)
  const folderIds = (folders || []).map(f => f.id)
  const { data: items } = folderIds.length
    ? await supabase.from('photo_share_items').select('storage_path, original_path').in('folder_id', folderIds)
    : { data: [] }
  // gallery_photo_submissions.photo_share_folder_id also cascades when the
  // folders are cascade-deleted below — any still-pending (unreviewed)
  // uploads for this person leak in storage forever unless read out now.
  const { data: pendingSubmissions } = folderIds.length
    ? await supabase.from('gallery_photo_submissions').select('storage_path, original_path').in('photo_share_folder_id', folderIds)
    : { data: [] }

  const { error } = await supabase.from('photo_share_people').delete().eq('id', personId)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const paths = [...new Set([
    ...(items || []).flatMap(i => [i.storage_path, i.original_path]),
    ...(pendingSubmissions || []).flatMap(i => [i.storage_path, i.original_path]),
  ].filter(Boolean))]
  if (paths.length) {
    await supabase.storage.from(BUCKET).remove(paths).catch(err =>
      captureException(err, { context: 'admin-photo-share-person-delete-storage', personId }))
  }

  await logAdminAction(supabase, adminUser?.email, {
    action: 'photo_share_person.delete', entityType: 'photo_share_person', entityId: personId, entityName: person?.name || person?.email,
  })
  return Response.json({ success: true })
}
