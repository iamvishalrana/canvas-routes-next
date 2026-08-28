import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { ALLOWED_EXTS, EXT_TO_MIME } from '../../../../../lib/allowedImageTypes'
import { createSignedUploadUrl } from '../../../../../lib/r2'

const BUCKET = 'gallery-photos'
const EXTS = ALLOWED_EXTS

// Issues one-time presigned upload URLs so the admin browser can push both
// the original and a pre-compressed display copy straight to R2 — full-size
// originals routinely exceed the serverless request-body limit, so neither
// can pass through an API route. Migrated from Supabase Storage to R2 (see
// lib/r2.js) 2026-08-28 — this bucket alone accounted for the large majority
// of Supabase Storage usage, and R2 has no egress cost.
//
// A display copy is uploaded separately rather than relying on an on-the-fly
// image transform endpoint: that approach proved unreliable for real camera
// originals (20-40MB DSLR/mirrorless JPEGs either fail the transform
// outright — broken-image icon — or succeed slowly enough that "loading" is
// indistinguishable from broken). A real small file has neither problem.
export async function POST(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { origExt, dispExt } = await request.json().catch(() => ({}))
  if (!EXTS.includes(origExt) || !EXTS.includes(dispExt)) {
    return Response.json({ error: 'Invalid file type.' }, { status: 400 })
  }

  const base = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const originalPath = `originals/${base}.${origExt}`
  const displayPath = `display/${base}.${dispExt}`

  try {
    const [orig, disp] = await Promise.all([
      createSignedUploadUrl({ bucket: BUCKET, path: originalPath, contentType: EXT_TO_MIME[origExt] }),
      createSignedUploadUrl({ bucket: BUCKET, path: displayPath, contentType: EXT_TO_MIME[dispExt] }),
    ])
    return Response.json({
      originalPath, originalUploadUrl: orig.uploadUrl,
      displayPath, displayUploadUrl: disp.uploadUrl,
    })
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to prepare upload.' }, { status: 500 })
  }
}
