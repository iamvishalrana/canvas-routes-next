import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'
import { readSession } from '../../../../../lib/otp'
import { ALLOWED_EXTS, ALLOWED_MIME_TYPES } from '../../../../../lib/allowedImageTypes'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BUCKET = 'photo-shares'

// Issues signed upload URLs for a non-member's self-submitted photo, gated by
// the same session proof /api/gallery/[token]/verify uses — the client never
// gets to assert its own personId, it's re-derived from the verified session.
export async function POST(request, { params }) {
  const { token } = await params
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 60, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })
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

  const bucketOpts = { public: true, allowedMimeTypes: ALLOWED_MIME_TYPES, fileSizeLimit: '40MB' }
  await admin.storage.createBucket(BUCKET, bucketOpts).catch(() =>
    admin.storage.updateBucket(BUCKET, bucketOpts).catch(() => {}))

  const base = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const originalPath = `submissions/${person.id}/${folder.id}/originals/${base}.${origExt}`
  const displayPath = `submissions/${person.id}/${folder.id}/display/${base}.${dispExt}`

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
