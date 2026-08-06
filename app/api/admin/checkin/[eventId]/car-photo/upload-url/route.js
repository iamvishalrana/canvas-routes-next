import { createAdminClient } from '../../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../../lib/supabase/authCheck'
import { MIME_TO_EXT, ALLOWED_MIME_TYPES } from '../../../../../../../lib/allowedImageTypes'

const BUCKET = 'route-car-photos'
const EXT_BY_MIME = MIME_TO_EXT

// Admin-side counterpart to the public upload-url route — issues a signed
// upload URL so the admin browser can push the photo straight to Supabase
// Storage on behalf of a registrant.
export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { eventId } = await params

  const { email, fileType } = await request.json().catch(() => ({}))
  if (!email) return Response.json({ error: 'Missing email.' }, { status: 400 })
  const ext = EXT_BY_MIME[fileType]
  if (!ext) return Response.json({ error: 'Unsupported image format.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: event } = await admin.from('events').select('id').eq('id', eventId).maybeSingle()
  if (!event) return Response.json({ error: 'Event not found.' }, { status: 404 })

  const bucketOpts = { public: true, allowedMimeTypes: ALLOWED_MIME_TYPES, fileSizeLimit: '40MB' }
  // createBucket() silently no-ops once the bucket already exists, so a
  // limit change here would never reach it without falling back to
  // updateBucket() for the already-exists case.
  await admin.storage.createBucket(BUCKET, bucketOpts).catch(() =>
    admin.storage.updateBucket(BUCKET, bucketOpts).catch(() => {}))

  const path = `${eventId}-${email.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.${ext}`
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ path, token: data.token })
}
