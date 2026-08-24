import { createAdminClient } from '../../../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../../../lib/supabase/authCheck'
import { MIME_TO_EXT } from '../../../../../../../../lib/allowedImageTypes'
import { findExistingSharedPhoto } from '../../../../../../../../lib/photoShareDedup'
import { createSignedUploadUrl } from '../../../../../../../../lib/r2'

const BUCKET = 'photo-shares'

// Issues one-time presigned upload URLs for both the original and a pre-
// compressed display copy, same dual-upload pattern as gallery-photos —
// Supabase's on-the-fly image transform endpoint proved unreliable for
// large camera originals. Migrated to R2 (see lib/r2.js) — presigned PUT
// URLs replace Supabase's signed-upload-token pair.
//
// If contentHash matches a photo already uploaded under a folder with this
// exact title (a group shot shared across several people's folders, most
// likely), no upload URLs are issued at all — the browser skips the upload
// entirely and just links the existing photo in. See lib/photoShareDedup.js.
export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { personId, folderId } = await params

  const { fileType, dispFileType, contentHash } = await request.json().catch(() => ({}))
  const ext = MIME_TO_EXT[fileType]
  const dispExt = MIME_TO_EXT[dispFileType]
  if (!ext || !dispExt) return Response.json({ error: 'Unsupported image format.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: folder } = await admin.from('photo_share_folders').select('id, title, expires_at').eq('id', folderId).eq('person_id', personId).maybeSingle()
  if (!folder) return Response.json({ error: 'Folder not found.' }, { status: 404 })
  if (new Date(folder.expires_at) <= new Date()) return Response.json({ error: 'This folder has already expired.' }, { status: 400 })

  const existing = await findExistingSharedPhoto(admin, { contentHash, folderTitle: folder.title })
  if (existing) return Response.json({ duplicate: true, photoId: existing.id })

  const base = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const originalPath = `${personId}/${folderId}/originals/${base}.${ext}`
  const displayPath = `${personId}/${folderId}/display/${base}.${dispExt}`

  try {
    const [orig, disp] = await Promise.all([
      createSignedUploadUrl({ bucket: BUCKET, path: originalPath, contentType: fileType }),
      createSignedUploadUrl({ bucket: BUCKET, path: displayPath, contentType: dispFileType }),
    ])
    return Response.json({
      originalPath, originalUploadUrl: orig.uploadUrl,
      displayPath, displayUploadUrl: disp.uploadUrl,
    })
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to prepare upload.' }, { status: 500 })
  }
}
