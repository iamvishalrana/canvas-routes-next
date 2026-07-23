import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { captureException } from '../../../../../lib/sentry'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'
import { findEventRegistrant } from '../../../../../lib/eventCheckinShared'
import { maybeSendCheckinCompleteEmail } from '../../../../../lib/maybeSendCheckinCompleteEmail.js'

const BUCKET = 'route-car-photos'

export async function POST(request, { params }) {
  const { eventId } = await params
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 })

  let formData
  try { formData = await request.formData() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }

  const email = normalizeEmail(formData.get('email'))
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const file = formData.get('photo')
  if (!file || typeof file === 'string') return Response.json({ error: 'No photo provided.' }, { status: 400 })
  if (file.size > 8 * 1024 * 1024) return Response.json({ error: 'File must be under 8 MB.' }, { status: 400 })
  if (!file.type.startsWith('image/')) return Response.json({ error: 'File must be an image.' }, { status: 400 })

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

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Magic byte check — verify file is actually an image, same as member/photo route
  const magicBytes = new Uint8Array(bytes.slice(0, 12))
  const isJpeg = magicBytes[0] === 0xFF && magicBytes[1] === 0xD8 && magicBytes[2] === 0xFF
  const isPng = magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47
  const isWebp = magicBytes[8] === 0x57 && magicBytes[9] === 0x45 && magicBytes[10] === 0x42 && magicBytes[11] === 0x50
  if (!isJpeg && !isPng && !isWebp) {
    return Response.json({ error: 'File must be a valid image (JPEG, PNG, or WebP).' }, { status: 400 })
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${eventId}-${email.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.${ext}`

  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {})
  const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, upsert: true })
  if (uploadErr) {
    captureException(new Error(uploadErr.message), { context: 'checkin-car-photo-upload', email, eventId })
    return Response.json({ error: 'Failed to upload photo. Please try again.' }, { status: 500 })
  }
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
