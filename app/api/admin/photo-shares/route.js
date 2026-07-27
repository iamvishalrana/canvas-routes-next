import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../lib/adminAudit.js'
import { captureException } from '../../../../lib/sentry'
import { normalizeEmail } from '../../../../lib/normalizeEmail'

const SHARE_LIFETIME_DAYS = 30

// Lists every active share with its photo count, newest first — the admin
// tab's "manage shares" list.
export async function GET() {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()

  const [{ data: shares, error }, { data: items }] = await Promise.all([
    supabase.from('photo_shares').select('*').order('created_at', { ascending: false }),
    supabase.from('photo_share_items').select('share_id'),
  ])
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const countByShare = new Map()
  for (const i of (items || [])) countByShare.set(i.share_id, (countByShare.get(i.share_id) || 0) + 1)

  return Response.json((shares || []).map(s => ({ ...s, photoCount: countByShare.get(s.id) || 0 })))
}

// Creates a new share — a title (shown to the recipient), a recipient email
// (doubles as the access password the recipient must type on the public
// page — see /api/gallery/[token]/verify — so it's required, not just an
// admin reference field), and a fresh token. Photos are uploaded afterward
// via ./[id]/upload-url + ./[id]/photos.
export async function POST(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const title = (body.title || '').toString().trim()
  if (!title) return Response.json({ error: 'Title is required.' }, { status: 400 })
  if (title.length > 120) return Response.json({ error: 'Title is too long.' }, { status: 400 })

  const recipientEmail = normalizeEmail(body.recipientEmail).slice(0, 200)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return Response.json({ error: 'A valid recipient email is required — it doubles as the access password.' }, { status: 400 })
  }
  const recipientName = (body.recipientName || '').toString().trim().slice(0, 120) || null
  const folder = (body.folder || '').toString().trim().slice(0, 120) || null
  const expiresAt = new Date(Date.now() + SHARE_LIFETIME_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const supabase = createAdminClient()
  const { data: share, error } = await supabase.from('photo_shares')
    .insert({ title, recipient_name: recipientName, recipient_email: recipientEmail, folder, expires_at: expiresAt })
    .select('*').single()

  if (error) {
    captureException(error, { context: 'admin-photo-shares-create' })
    return Response.json({ error: error.message }, { status: 500 })
  }

  await logAdminAction(supabase, adminUser?.email, {
    action: 'photo_share.create', entityType: 'photo_share', entityId: share.id, entityName: title,
  })
  return Response.json({ ...share, photoCount: 0 })
}
