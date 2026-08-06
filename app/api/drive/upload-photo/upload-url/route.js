import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { MIME_TO_EXT, ALLOWED_MIME_TYPES } from '../../../../../lib/allowedImageTypes'

const UPLOAD_PASSWORD = 'laurentians'
const BUCKET = 'drive-photos'

// Signed-upload-URL step for the "Into the Laurentians" itinerary page's
// single self-serve photo replacement (Frederic's car photo) — the browser
// PUTs straight to Supabase Storage from here, bypassing the ~4.5MB Vercel
// serverless request-body cap that the old direct-POST-to-API-route version
// was silently capped by (and which never actually persisted anywhere on
// Vercel in the first place — it wrote to the read-only public/ dir, then
// fell back to ephemeral /tmp, so every upload failed regardless of size).
// Gated by the same shared password as the page itself — there's no
// stronger auth model here to match, same trust level as the original.
export async function POST(request) {
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 5, 60, 'drive-upload-photo')) {
    return Response.json({ error: 'Too many attempts. Please try again in a minute.' }, { status: 429 })
  }

  const { pw, fileType } = await request.json().catch(() => ({}))
  if (pw !== UPLOAD_PASSWORD) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ext = MIME_TO_EXT[fileType]
  if (!ext) return Response.json({ error: 'Unsupported image format.' }, { status: 400 })

  const admin = createAdminClient()
  const bucketOpts = { public: true, allowedMimeTypes: ALLOWED_MIME_TYPES, fileSizeLimit: '40MB' }
  await admin.storage.createBucket(BUCKET, bucketOpts).catch(() =>
    admin.storage.updateBucket(BUCKET, bucketOpts).catch(() => {}))

  // Timestamped so a re-upload never collides with (or gets served stale
  // from a CDN cache alongside) a previous one.
  const path = `car-frederic-lefebvre-${Date.now()}.${ext}`
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ path, token: data.token })
}
