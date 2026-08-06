import { createAdminClient } from '../../../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../../../lib/supabase/authCheck'
import { MIME_TO_EXT, ALLOWED_MIME_TYPES } from '../../../../../../../../lib/allowedImageTypes'

const BUCKET = 'photo-shares'

// Issues one-time signed upload URLs for both the original and a pre-
// compressed display copy, same dual-upload pattern as gallery-photos —
// Supabase's on-the-fly image transform endpoint proved unreliable for
// large camera originals.
export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { personId, folderId } = await params

  const { fileType, dispFileType } = await request.json().catch(() => ({}))
  const ext = MIME_TO_EXT[fileType]
  const dispExt = MIME_TO_EXT[dispFileType]
  if (!ext || !dispExt) return Response.json({ error: 'Unsupported image format.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: folder } = await admin.from('photo_share_folders').select('id, expires_at').eq('id', folderId).eq('person_id', personId).maybeSingle()
  if (!folder) return Response.json({ error: 'Folder not found.' }, { status: 404 })
  if (new Date(folder.expires_at) <= new Date()) return Response.json({ error: 'This folder has already expired.' }, { status: 400 })

  const bucketOpts = { public: true, allowedMimeTypes: ALLOWED_MIME_TYPES, fileSizeLimit: '100MB' }
  await admin.storage.createBucket(BUCKET, bucketOpts).catch(() =>
    admin.storage.updateBucket(BUCKET, bucketOpts).catch(() => {}))

  const base = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const originalPath = `${personId}/${folderId}/originals/${base}.${ext}`
  const displayPath = `${personId}/${folderId}/display/${base}.${dispExt}`

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
