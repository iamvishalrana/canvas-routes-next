import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../../lib/rateLimit'
import { normalizeEmail } from '../../../../../../lib/normalizeEmail'
import { findEventRegistrant } from '../../../../../../lib/eventCheckinShared'
import { MIME_TO_EXT, ALLOWED_MIME_TYPES } from '../../../../../../lib/allowedImageTypes'
import { captureException } from '../../../../../../lib/sentry'
import { isValidEmail } from '../../../../../../lib/emailValidation'

const BUCKET = 'route-car-photos'
const EXT_BY_MIME = MIME_TO_EXT

// Issues a one-time signed upload URL for the registrant's browser to push
// the photo straight to Supabase Storage, bypassing the serverless
// request-body limit. All the gating that used to happen inline in the old
// single-request route (event/checkin_sections check, registrant lookup,
// "already submitted" block, rate limiting) happens here, before any upload
// is allowed — the confirm step re-validates ownership before writing.
export async function POST(request, { params }) {
  const { eventId } = await params
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const email = normalizeEmail(body.email)
  if (!email || !isValidEmail(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  const ext = EXT_BY_MIME[body.fileType]
  if (!ext) return Response.json({ error: 'Unsupported image format.' }, { status: 400 })

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

  const bucketOpts = { public: true, allowedMimeTypes: ALLOWED_MIME_TYPES, fileSizeLimit: '40MB' }
  // createBucket() silently no-ops once the bucket already exists, so a
  // limit change here would never reach it without falling back to
  // updateBucket() for the already-exists case. A failure of THAT call must
  // also not be silently swallowed — see lib/allowedImageTypes.js's SVG
  // comment (2026-08-24 review) for why a stale/missing bucket-level
  // allowlist is a real security gap, not just a config nicety.
  await admin.storage.createBucket(BUCKET, bucketOpts).catch(() =>
    admin.storage.updateBucket(BUCKET, bucketOpts).catch(err =>
      captureException(err, { context: 'checkin-car-photo-bucket-config', bucket: BUCKET })))

  const path = `${eventId}-${email.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.${ext}`
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ path, token: data.token })
}
