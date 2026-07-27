import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'

const BUCKET = 'photo-shares'
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

// Issues a one-time signed upload URL so the admin browser can push a photo
// straight to Supabase Storage, same direct-upload pattern as every other
// bucket — bulk-selecting a dozen camera originals would otherwise blow past
// the serverless request-body limit fast.
export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const { fileType } = await request.json().catch(() => ({}))
  const ext = EXT_BY_MIME[fileType]
  if (!ext) return Response.json({ error: 'File must be a valid image (JPEG, PNG, or WebP).' }, { status: 400 })

  const admin = createAdminClient()
  const { data: share } = await admin.from('photo_shares').select('id, expires_at').eq('id', id).maybeSingle()
  if (!share) return Response.json({ error: 'Share not found.' }, { status: 404 })
  if (new Date(share.expires_at) <= new Date()) return Response.json({ error: 'This share has already expired.' }, { status: 400 })

  const bucketOpts = { public: true, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'], fileSizeLimit: '40MB' }
  await admin.storage.createBucket(BUCKET, bucketOpts).catch(() =>
    admin.storage.updateBucket(BUCKET, bucketOpts).catch(() => {}))

  const path = `${id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ path, token: data.token })
}
