import { createClient } from '../../../../../lib/supabase/server'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { memberPhotoPath, EXT_BY_MIME } from '../../../../../lib/memberPhotoPath'
import { ALLOWED_MIME_TYPES } from '../../../../../lib/allowedImageTypes'

const BUCKET = 'member-photos'
// Matches the profile page's own cap and the confirm route's check
// (app/api/member/photo/route.js) — kept in sync manually since it's a tiny,
// stable constant, not worth a shared import for.
const MAX_CARS = 5

// Issues a one-time signed upload URL so the member's browser can push the
// photo straight to Supabase Storage, bypassing the serverless request-body
// limit. upsert:true is required here (not on uploadToSignedUrl) since these
// paths are deterministic and get overwritten on every replace.
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const kind = body.kind === 'avatar' ? 'avatar' : 'car'
  const carIndex = kind === 'car' && body.carIndex !== null && body.carIndex !== undefined && body.carIndex !== ''
    ? parseInt(body.carIndex, 10) : null
  const ext = EXT_BY_MIME[body.fileType]
  if (!ext) return Response.json({ error: 'Unsupported image format.' }, { status: 400 })
  if (carIndex !== null && (!Number.isInteger(carIndex) || carIndex < 0 || carIndex >= MAX_CARS)) {
    return Response.json({ error: 'Invalid car index.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const bucketOpts = { public: true, allowedMimeTypes: ALLOWED_MIME_TYPES, fileSizeLimit: '40MB' }
  // createBucket() silently no-ops once the bucket already exists, so a
  // limit change here would never reach it without falling back to
  // updateBucket() for the already-exists case.
  await admin.storage.createBucket(BUCKET, bucketOpts).catch(() =>
    admin.storage.updateBucket(BUCKET, bucketOpts).catch(() => {}))

  const path = memberPhotoPath(user.id, kind, carIndex, ext)
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ path, token: data.token })
}
