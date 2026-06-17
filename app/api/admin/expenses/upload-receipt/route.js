import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { captureException } from '../../../../../lib/sentry'

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

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  let formData
  try { formData = await request.formData() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const file       = formData.get('file')
  const folderPath = formData.get('folder_path') || ''

  if (!file || typeof file === 'string') return Response.json({ error: 'No file provided.' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: 'Only images and PDFs are accepted.' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  if (arrayBuffer.byteLength > MAX_BYTES) {
    return Response.json({ error: 'File too large (max 10 MB).' }, { status: 400 })
  }

  const folder = sanitizeFolderPath(folderPath)
  const ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const filename = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

  const supabase = createAdminClient()
  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(filename, Buffer.from(arrayBuffer), { contentType: file.type, upsert: false })

  if (uploadError) {
    captureException(uploadError, { context: 'expenses-upload-receipt', filename })
    return Response.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(filename)
  return Response.json({ url: publicUrl })
}
