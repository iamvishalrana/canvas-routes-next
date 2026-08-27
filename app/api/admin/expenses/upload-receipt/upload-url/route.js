import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { createSignedUploadUrl } from '../../../../../../lib/r2'

const BUCKET = 'receipts'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']

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
  // Some file managers (esp. on Android/desktop) hand a HEIC/HEIF photo over
  // with a generic or empty MIME type instead of image/heic — fall back to
  // the filename extension so a real photo isn't rejected outright. Mirrors
  // the sniffing lib/convertHeicIfNeeded.js already does client-side.
  const nameLower = (fileName || '').toLowerCase()
  const looksHeic = nameLower.endsWith('.heic') || nameLower.endsWith('.heif')
  if (!ALLOWED_TYPES.includes(fileType) && !looksHeic) {
    return Response.json({ error: 'Only images and PDFs are accepted.' }, { status: 400 })
  }

  const folder = sanitizeFolderPath(folderPath)
  const ext = (fileName || '').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { uploadUrl } = await createSignedUploadUrl({ bucket: BUCKET, path, contentType: fileType || 'application/octet-stream' })
  return Response.json({ path, uploadUrl })
}
