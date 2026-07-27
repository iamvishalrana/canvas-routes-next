import { createClient } from '../../../../../lib/supabase/server'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { memberPhotoPath, EXT_BY_MIME } from '../../../../../lib/memberPhotoPath'

const BUCKET = 'member-photos'

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
  if (!ext) return Response.json({ error: 'File must be a valid image (JPEG, PNG, or WebP).' }, { status: 400 })

  const admin = createAdminClient()
  await admin.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    fileSizeLimit: '8MB',
  }).catch(() => {})

  const path = memberPhotoPath(user.id, kind, carIndex, ext)
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ path, token: data.token })
}
