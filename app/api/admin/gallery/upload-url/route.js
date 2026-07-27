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
  await supabase.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    fileSizeLimit: '15MB',
  }).catch(() => {})

  const base = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const originalPath = `originals/${base}.${origExt}`

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(originalPath)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ originalPath, originalToken: data.token })
}
