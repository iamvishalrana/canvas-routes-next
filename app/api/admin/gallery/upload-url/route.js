import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'

const BUCKET = 'gallery-photos'
const EXTS = ['jpg', 'png', 'webp']

// Issues a one-time signed upload URL so the admin browser can push the photo
// file straight to Supabase Storage — full-size originals routinely exceed
// the serverless request-body limit, so they must not pass through an API
// route. Only the original is uploaded now — display/thumbnail sizes are
// rendered on demand via Supabase's built-in image transform endpoint
// (lib/supabaseImageUrl.js) instead of uploading a second compressed copy.
export async function POST(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { origExt } = await request.json().catch(() => ({}))
  if (!EXTS.includes(origExt)) {
    return Response.json({ error: 'Invalid file type.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const bucketOpts = { public: true, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'], fileSizeLimit: '40MB' }
  // createBucket() silently no-ops once the bucket already exists — a limit
  // raised here in code would never actually reach it without this, which is
  // exactly what happened when this was 15MB: real camera JPEGs (DSLR/
  // mirrorless originals routinely run 20-40MB) got rejected by the client's
  // matching check with no way for a code change alone to fix it server-side.
  await supabase.storage.createBucket(BUCKET, bucketOpts).catch(() =>
    supabase.storage.updateBucket(BUCKET, bucketOpts).catch(() => {}))

  const base = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const originalPath = `originals/${base}.${origExt}`

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(originalPath)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ originalPath, originalToken: data.token })
}
