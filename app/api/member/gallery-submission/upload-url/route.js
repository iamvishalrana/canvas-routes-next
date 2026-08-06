import { createClient } from '../../../../../lib/supabase/server'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { ALLOWED_EXTS, ALLOWED_MIME_TYPES } from '../../../../../lib/allowedImageTypes'
import { attendanceKey } from '../../../../../lib/eventMeta'

const BUCKET = 'gallery-photos'

// Issues signed upload URLs for a member's self-submitted event photo — same
// dual-file (original + compressed display) pattern as the admin gallery
// upload (app/api/admin/gallery/upload-url/route.js), but paths are scoped
// under submissions/<memberId>/... and the target event must be one the
// member is actually confirmed to have attended (never trust the client's
// album string blindly — same check repeated in the record route below,
// since a client could call these two routes independently).
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 60, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  const { album, origExt, dispExt } = await request.json().catch(() => ({}))
  if (!ALLOWED_EXTS.includes(origExt) || !ALLOWED_EXTS.includes(dispExt)) {
    return Response.json({ error: 'Invalid file type.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: member } = await admin.from('members').select('event_attendance').eq('id', user.id).maybeSingle()
  const attendance = member?.event_attendance || {}
  if (!album || attendance[attendanceKey(album)] !== true) {
    return Response.json({ error: 'You can only submit photos for an event you attended.' }, { status: 400 })
  }

  const bucketOpts = { public: true, allowedMimeTypes: ALLOWED_MIME_TYPES, fileSizeLimit: '100MB' }
  await admin.storage.createBucket(BUCKET, bucketOpts).catch(() =>
    admin.storage.updateBucket(BUCKET, bucketOpts).catch(() => {}))

  const base = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const originalPath = `submissions/${user.id}/originals/${base}.${origExt}`
  const displayPath = `submissions/${user.id}/display/${base}.${dispExt}`

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
