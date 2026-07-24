import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { normalizeEmail } from '../../../../../../lib/normalizeEmail'
import { captureException } from '../../../../../../lib/sentry'

const BUCKET = 'route-car-photos'

// Admin-side counterpart to the public app/api/checkin/[eventId]/car-photo
// route — for attaching a photo on behalf of a registrant who hasn't (or
// won't) self-submit one, e.g. a non-member or someone who joined before the
// car-photo check-in step existed. Unlike the public route, this can
// overwrite an existing photo and doesn't require checkin_sections to be on.
export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { eventId } = await params

  let formData
  try { formData = await request.formData() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }

  const email = normalizeEmail(formData.get('email'))
  if (!email) return Response.json({ error: 'Missing email.' }, { status: 400 })

  const file = formData.get('photo')
  if (!file || typeof file === 'string') return Response.json({ error: 'No photo provided.' }, { status: 400 })
  if (file.size > 8 * 1024 * 1024) return Response.json({ error: 'File must be under 8 MB.' }, { status: 400 })
  if (!file.type.startsWith('image/')) return Response.json({ error: 'File must be an image.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: event } = await admin.from('events').select('id, name').eq('id', eventId).maybeSingle()
  if (!event) return Response.json({ error: 'Event not found.' }, { status: 404 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const magicBytes = new Uint8Array(bytes.slice(0, 12))
  const isJpeg = magicBytes[0] === 0xFF && magicBytes[1] === 0xD8 && magicBytes[2] === 0xFF
  const isPng = magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47
  const isWebp = magicBytes[8] === 0x57 && magicBytes[9] === 0x45 && magicBytes[10] === 0x42 && magicBytes[11] === 0x50
  if (!isJpeg && !isPng && !isWebp) {
    return Response.json({ error: 'File must be a valid image (JPEG, PNG, or WebP).' }, { status: 400 })
  }

  // Clean up a prior photo (if any) so admin overwrites don't leave orphaned files.
  const { data: existing } = await admin.from('event_checkins').select('car_photo').eq('event_id', eventId).eq('email', email).maybeSingle()
  const oldUrl = existing?.car_photo?.url
  const oldPath = oldUrl ? oldUrl.split(`/${BUCKET}/`)[1]?.split('?')[0] : null
  if (oldPath) await admin.storage.from(BUCKET).remove([oldPath]).catch(() => {})

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${eventId}-${email.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.${ext}`

  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {})
  const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, upsert: true })
  if (uploadErr) {
    captureException(new Error(uploadErr.message), { context: 'admin-checkin-car-photo-upload', email, eventId })
    return Response.json({ error: 'Failed to upload photo. Please try again.' }, { status: 500 })
  }
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
