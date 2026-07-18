import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'

const BUCKET = 'gallery-photos'
const EXTS = ['jpg', 'png', 'webp']

// Issues one-time signed upload URLs so the admin browser can push photo files
// straight to Supabase Storage — full-size originals routinely exceed the
// serverless request-body limit, so they must not pass through an API route.
export async function POST(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { origExt, dispExt } = await request.json().catch(() => ({}))
  if (!EXTS.includes(origExt) || !EXTS.includes(dispExt)) {
    return Response.json({ error: 'Invalid file type.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {})

  const base = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const originalPath = `originals/${base}.${origExt}`
  const displayPath = `display/${base}.${dispExt}`

  const [orig, disp] = await Promise.all([
    supabase.storage.from(BUCKET).createSignedUploadUrl(originalPath),
    supabase.storage.from(BUCKET).createSignedUploadUrl(displayPath),
  ])
  if (orig.error || disp.error) {
    return Response.json({ error: (orig.error || disp.error).message }, { status: 500 })
  }

  return Response.json({
    originalPath, originalToken: orig.data.token,
    displayPath, displayToken: disp.data.token,
  })
}
