import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { MIME_TO_EXT, ALLOWED_MIME_TYPES } from '../../../../../../lib/allowedImageTypes'

const BUCKET = 'photo-shares'
const EXT_BY_MIME = MIME_TO_EXT

// Issues one-time signed upload URLs for both the original and a pre-
// compressed display copy, same dual-upload pattern as gallery-photos —
// Supabase's on-the-fly image transform endpoint proved unreliable for
// large camera originals (broken-image icon, or slow enough to look
// broken), so the display copy is a real small file, not a live transform.
export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const { fileType, dispFileType } = await request.json().catch(() => ({}))
  const ext = EXT_BY_MIME[fileType]
  const dispExt = EXT_BY_MIME[dispFileType]
  if (!ext || !dispExt) return Response.json({ error: 'Unsupported image format.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: share } = await admin.from('photo_shares').select('id, expires_at').eq('id', id).maybeSingle()
  if (!share) return Response.json({ error: 'Share not found.' }, { status: 404 })
  if (new Date(share.expires_at) <= new Date()) return Response.json({ error: 'This share has already expired.' }, { status: 400 })

  const bucketOpts = { public: true, allowedMimeTypes: ALLOWED_MIME_TYPES, fileSizeLimit: '40MB' }
  await admin.storage.createBucket(BUCKET, bucketOpts).catch(() =>
    admin.storage.updateBucket(BUCKET, bucketOpts).catch(() => {}))

  const base = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const originalPath = `${id}/originals/${base}.${ext}`
  const displayPath = `${id}/display/${base}.${dispExt}`

  const [origResult, dispResult] = await Promise.all([
    admin.storage.from(BUCKET).createSignedUploadUrl(originalPath),
    admin.storage.from(BUCKET).createSignedUploadUrl(displayPath),
  ])
  if (origResult.error) return Response.json({ error: origResult.error.message }, { status: 500 })
  if (dispResult.error) return Response.json({ error: dispResult.error.message }, { status: 500 })

  return Response.json({
    originalPath, originalToken: origResult.data.token,
    displayPath, displayToken: dispResult.data.token,
  })
}
