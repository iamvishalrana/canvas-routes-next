import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'
import { readSession } from '../../../../../lib/otp'
import { ALLOWED_EXTS, EXT_TO_MIME } from '../../../../../lib/allowedImageTypes'
import { createSignedUploadUrl } from '../../../../../lib/r2'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BUCKET = 'photo-shares'

// Issues signed upload URLs for a non-member's self-submitted photo, gated by
// the same session proof /api/gallery/[token]/verify uses — the client never
// gets to assert its own personId, it's re-derived from the verified session.
export async function POST(request, { params }) {
  const { token } = await params
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 60, 60, 'gallery-submit-upload-url')) return Response.json({ error: 'Too many requests.' }, { status: 429 })
  if (!UUID_RE.test(token)) return Response.json({ error: 'Not found.' }, { status: 404 })

  const { sessionId, folderId, origExt, dispExt } = await request.json().catch(() => ({}))
  const email = await readSession(token, sessionId)
  if (!email) return Response.json({ error: 'Session expired.' }, { status: 401 })
  if (!ALLOWED_EXTS.includes(origExt) || !ALLOWED_EXTS.includes(dispExt)) {
    return Response.json({ error: 'Invalid file type.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: person } = await admin.from('photo_share_people').select('id, email').eq('token', token).maybeSingle()
  if (!person || normalizeEmail(person.email) !== email) return Response.json({ error: 'Session expired.' }, { status: 401 })

  const { data: folder } = await admin.from('photo_share_folders').select('id, expires_at').eq('id', folderId).eq('person_id', person.id).maybeSingle()
  if (!folder) return Response.json({ error: 'Folder not found.' }, { status: 404 })
  if (new Date(folder.expires_at) <= new Date()) return Response.json({ error: 'This folder has expired.' }, { status: 400 })

  const base = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const originalPath = `submissions/${person.id}/${folder.id}/originals/${base}.${origExt}`
  const displayPath = `submissions/${person.id}/${folder.id}/display/${base}.${dispExt}`

  try {
    const [orig, disp] = await Promise.all([
      createSignedUploadUrl({ bucket: BUCKET, path: originalPath, contentType: EXT_TO_MIME[origExt] }),
      createSignedUploadUrl({ bucket: BUCKET, path: displayPath, contentType: EXT_TO_MIME[dispExt] }),
    ])
    return Response.json({
      originalPath, originalUploadUrl: orig.uploadUrl,
      displayPath, displayUploadUrl: disp.uploadUrl,
    })
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to prepare upload.' }, { status: 500 })
  }
}
