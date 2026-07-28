import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../../../lib/adminAudit.js'

const DEFAULT_FOLDER_LIFETIME_DAYS = 30
const MIN_LIFETIME_DAYS = 1
const MAX_LIFETIME_DAYS = 365

// Creates a new event folder under a person — e.g. they attended a second
// meet three months later, so a fresh folder goes under the same person
// rather than issuing them a whole new link+password. Lifetime defaults to
// 30 days but is admin-adjustable per folder (see also the PATCH handler in
// ./[folderId]/route.js for changing an already-created folder's expiry).
export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { personId } = await params

  const body = await request.json().catch(() => ({}))
  const title = (body.title || '').toString().trim()
  if (!title) return Response.json({ error: 'Folder title is required.' }, { status: 400 })
  if (title.length > 120) return Response.json({ error: 'Title is too long.' }, { status: 400 })

  let lifetimeDays = parseInt(body.lifetimeDays, 10)
  if (!Number.isFinite(lifetimeDays)) lifetimeDays = DEFAULT_FOLDER_LIFETIME_DAYS
  lifetimeDays = Math.min(MAX_LIFETIME_DAYS, Math.max(MIN_LIFETIME_DAYS, lifetimeDays))

  const supabase = createAdminClient()
  const { data: person } = await supabase.from('photo_share_people').select('id, name, email').eq('id', personId).maybeSingle()
  if (!person) return Response.json({ error: 'Person not found.' }, { status: 404 })

  const expiresAt = new Date(Date.now() + lifetimeDays * 24 * 60 * 60 * 1000).toISOString()
  const { data: folder, error } = await supabase.from('photo_share_folders')
    .insert({ person_id: personId, title, expires_at: expiresAt }).select('*').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await logAdminAction(supabase, adminUser?.email, {
    action: 'photo_share_folder.create', entityType: 'photo_share_folder', entityId: folder.id,
    entityName: `${person.name || person.email} — ${title}`,
  })
  return Response.json({ ...folder, photoCount: 0 })
}
