import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { normalizeEmail } from '../../../../../../lib/normalizeEmail'
import { captureException } from '../../../../../../lib/sentry'
import { ALLOWED_EXTS } from '../../../../../../lib/allowedImageTypes'

const BUCKET = 'route-car-photos'

// Admin-side counterpart to the public app/api/checkin/[eventId]/car-photo
// route — for attaching a photo on behalf of a registrant who hasn't (or
// won't) self-submit one, e.g. a non-member or someone who joined before the
// car-photo check-in step existed. Unlike the public route, this can
// overwrite an existing photo and doesn't require checkin_sections to be on.
const PATH_RE = new RegExp(`^[\\w-]+\\.(${ALLOWED_EXTS.join('|')})$`)

// Records the car photo after the admin browser has uploaded it directly to
// the route-car-photos bucket via a signed upload URL (see ./upload-url).
export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { eventId } = await params

  const body = await request.json().catch(() => ({}))
  const email = normalizeEmail(body.email)
  const { path } = body
  if (!email) return Response.json({ error: 'Missing email.' }, { status: 400 })
  if (!PATH_RE.test(path || '') || !path.startsWith(`${eventId}-`)) {
    return Response.json({ error: 'Invalid storage path.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: event } = await admin.from('events').select('id, name').eq('id', eventId).maybeSingle()
  if (!event) return Response.json({ error: 'Event not found.' }, { status: 404 })

  const { data: exists } = await admin.storage.from(BUCKET).exists(path)
  if (!exists) return Response.json({ error: 'Upload incomplete — please retry.' }, { status: 400 })

  // Clean up a prior photo (if any) so admin overwrites don't leave orphaned files.
  const { data: existing } = await admin.from('event_checkins').select('car_photo').eq('event_id', eventId).eq('email', email).maybeSingle()
  const oldUrl = existing?.car_photo?.url
  const oldPath = oldUrl ? oldUrl.split(`/${BUCKET}/`)[1]?.split('?')[0] : null
  if (oldPath && oldPath !== path) await admin.storage.from(BUCKET).remove([oldPath]).catch(() => {})

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)

  const carPhoto = { url: publicUrl, submitted_at: new Date().toISOString(), added_by_admin: true }
  const { error: upsertErr } = await admin.from('event_checkins').upsert(
    { event_id: eventId, email, car_photo: carPhoto, updated_at: new Date().toISOString() },
    { onConflict: 'event_id,email' }
  )
  if (upsertErr) {
    captureException(upsertErr, { context: 'admin-checkin-car-photo-save', email, eventId })
    return Response.json({ error: 'Photo uploaded but could not be saved. Please try again.' }, { status: 500 })
  }

  return Response.json({ success: true, carPhoto })
}
