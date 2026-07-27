import { createAdminClient } from '../../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../../lib/supabase/authCheck'

const BUCKET = 'event-photos'
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

// Issues a one-time signed upload URL so the admin browser can push the photo
// file straight to Supabase Storage, bypassing the serverless request-body
// limit and the old server-side magic-byte sniffing (the bucket's
// allowedMimeTypes/fileSizeLimit now enforce that at the storage layer).
export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const { fileType } = await request.json().catch(() => ({}))
  const ext = EXT_BY_MIME[fileType]
  if (!ext) return Response.json({ error: 'File must be a JPEG, PNG, or WebP image.' }, { status: 400 })

  const admin = createAdminClient()
  const bucketOpts = { public: true, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'], fileSizeLimit: '20MB' }
  // createBucket() silently no-ops once the bucket already exists, so a
  // limit change here would never reach it without falling back to
  // updateBucket() for the already-exists case.
  await admin.storage.createBucket(BUCKET, bucketOpts).catch(() =>
    admin.storage.updateBucket(BUCKET, bucketOpts).catch(() => {}))

  // Timestamp in filename busts CDN and browser caches on every upload
  const path = `${id}-${Date.now()}.${ext}`
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ path, token: data.token })
}
