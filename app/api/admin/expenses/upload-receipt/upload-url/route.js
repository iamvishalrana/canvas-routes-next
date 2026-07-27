import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../../lib/supabase/admin'

const BUCKET = 'receipts'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']

function sanitizeFolderPath(raw) {
  if (!raw?.trim()) return 'general'
  return raw.trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-\/]/g, '')   // only alphanumeric, hyphens, slashes
    .replace(/\/+/g, '/')             // collapse consecutive slashes
    .replace(/^\/|\/$/g, '')          // strip leading/trailing slashes
    .replace(/\.\.+/g, '')            // strip path traversal
    || 'general'
}

// Issues a one-time signed upload URL so the admin browser can push the
// receipt file straight to Supabase Storage, bypassing the serverless
// request-body limit (receipts include scanned PDFs, which run larger than
// typical phone photos).
export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { folderPath, fileName, fileType } = await request.json().catch(() => ({}))
  if (!ALLOWED_TYPES.includes(fileType)) {
    return Response.json({ error: 'Only images and PDFs are accepted.' }, { status: 400 })
  }

  const admin = createAdminClient()
  await admin.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: ALLOWED_TYPES,
    fileSizeLimit: '10MB',
  }).catch(() => {})

  const folder = sanitizeFolderPath(folderPath)
  const ext = (fileName || '').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ path, token: data.token })
}
