import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'

const BUCKET = 'gallery-photos'
const EXTS = ['jpg', 'png', 'webp']

// Issues one-time signed upload URLs so the admin browser can push both the
// original and a pre-compressed display copy straight to Supabase Storage —
// full-size originals routinely exceed the serverless request-body limit,
// so neither can pass through an API route.
//
// A display copy is uploaded separately rather than relying on Supabase's
// on-the-fly image transform endpoint: that endpoint turned out unreliable
// for real camera originals (20-40MB DSLR/mirrorless JPEGs either fail the
// transform outright — broken-image icon — or succeed slowly enough that
// "loading" is indistinguishable from broken). A real small file has
// neither problem.
export async function POST(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { origExt, dispExt } = await request.json().catch(() => ({}))
  if (!EXTS.includes(origExt) || !EXTS.includes(dispExt)) {
    return Response.json({ error: 'Invalid file type.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const bucketOpts = { public: true, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'], fileSizeLimit: '40MB' }
  // createBucket() silently no-ops once the bucket already exists — a limit
  // raised here in code would never actually reach it without falling back
  // to updateBucket() for the already-exists case.
  await supabase.storage.createBucket(BUCKET, bucketOpts).catch(() =>
    supabase.storage.updateBucket(BUCKET, bucketOpts).catch(() => {}))

  const base = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const originalPath = `originals/${base}.${origExt}`
  const displayPath = `display/${base}.${dispExt}`

  const [origResult, dispResult] = await Promise.all([
    supabase.storage.from(BUCKET).createSignedUploadUrl(originalPath),
    supabase.storage.from(BUCKET).createSignedUploadUrl(displayPath),
  ])
  if (origResult.error) return Response.json({ error: origResult.error.message }, { status: 500 })
  if (dispResult.error) return Response.json({ error: dispResult.error.message }, { status: 500 })

  return Response.json({
    originalPath, originalToken: origResult.data.token,
    displayPath, displayToken: dispResult.data.token,
  })
}
