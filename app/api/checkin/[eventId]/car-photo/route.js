import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { captureException } from '../../../../../lib/sentry'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'
import { findEventRegistrant } from '../../../../../lib/eventCheckinShared'
import { maybeSendCheckinCompleteEmail } from '../../../../../lib/maybeSendCheckinCompleteEmail.js'
import { ALLOWED_EXTS } from '../../../../../lib/allowedImageTypes'

const BUCKET = 'route-car-photos'

const PATH_RE = new RegExp(`^[\\w-]+\\.(${ALLOWED_EXTS.join('|')})$`)

// Records the car photo after the browser has uploaded it directly to the
// route-car-photos bucket via a signed upload URL (see ./upload-url). All
// the gating already happened there — this step re-validates ownership
// (registrant lookup + "already submitted") before writing, since the
// upload itself only proved the file exists, not who it belongs to.
export async function POST(request, { params }) {
  const { eventId } = await params
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const email = normalizeEmail(body.email)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  const { path } = body
  if (!PATH_RE.test(path || '') || !path.startsWith(`${eventId}-`)) {
    return Response.json({ error: 'Invalid storage path.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: event } = await admin.from('events')
    .select('id, name, checkin_enabled, checkin_sections')
    .eq('id', eventId).maybeSingle()
  if (!event || !event.checkin_enabled || !(event.checkin_sections || []).includes('car_photo')) {
    return Response.json({ error: 'Check-in is not available for this event.' }, { status: 404 })
  }

  const registrant = await findEventRegistrant(admin, eventId, event.name, email)
  if (!registrant) return Response.json({ error: 'No matching registration found.' }, { status: 404 })

  const { data: existing } = await admin.from('event_checkins')
    .select('car_photo').eq('event_id', eventId).eq('email', email).maybeSingle()
  if (existing?.car_photo) return Response.json({ error: 'A photo has already been submitted.' }, { status: 400 })

  const { data: exists } = await admin.storage.from(BUCKET).exists(path)
  if (!exists) return Response.json({ error: 'Upload incomplete — please retry.' }, { status: 400 })

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)

  const carPhoto = { url: publicUrl, submitted_at: new Date().toISOString() }
  const { error: upsertErr } = await admin.from('event_checkins').upsert(
    { event_id: eventId, email, name: registrant.name, car_photo: carPhoto, updated_at: new Date().toISOString() },
    { onConflict: 'event_id,email' }
  )
  if (upsertErr) {
    captureException(upsertErr, { context: 'checkin-car-photo-save', email, eventId })
    return Response.json({ error: 'Photo uploaded but could not be saved. Please try again.' }, { status: 500 })
  }

  await maybeSendCheckinCompleteEmail(admin, eventId, email, event.name).catch(err => captureException(err, { context: 'checkin-complete-trigger-car-photo', email, eventId }))

  return Response.json({ success: true, carPhoto })
}
