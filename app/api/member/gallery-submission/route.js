import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit'
import { captureException } from '../../../../lib/sentry'
import { ALLOWED_EXTS } from '../../../../lib/allowedImageTypes'
import { attendanceKey } from '../../../../lib/eventMeta'
import { objectExists, getPublicUrl } from '../../../../lib/r2'

const BUCKET = 'gallery-photos'
// Ceiling on how many un-reviewed submissions one member can have sitting in
// the queue at once — the 20-per-batch UI cap only slows a single upload
// screen, it doesn't stop someone from re-running batches indefinitely, so
// this is the real backstop against unbounded storage growth/review-queue
// spam.
const MAX_PENDING_PER_MEMBER = 50

function pathRegexFor(memberId) {
  return new RegExp(`^submissions/${memberId}/(originals|display)/[\\w-]+\\.(${ALLOWED_EXTS.join('|')})$`)
}

// Records a member's self-submitted event photo into the staging table —
// never gallery_photos directly. It stays invisible to everyone (including
// the submitting member) until an admin publishes it from
// /admin/photos/submissions. See supabase/migrations/20260810_gallery_photo_submissions.sql.
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 60, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const album = (body.album || '').toString().trim()
  const albumDate = (body.albumDate || '').toString().trim()
  const caption = (body.caption || '').toString().trim().slice(0, 300) || null
  const { originalPath, displayPath } = body

  const admin = createAdminClient()
  const { data: member } = await admin.from('members').select('name, email, event_attendance').eq('id', user.id).maybeSingle()
  if (!member) return Response.json({ error: 'Member not found.' }, { status: 404 })

  const attendance = member.event_attendance || {}
  if (!album || attendance[attendanceKey(album)] !== true) {
    return Response.json({ error: 'You can only submit photos for an event you attended.' }, { status: 400 })
  }
  if (albumDate && !/^\d{4}-\d{2}-\d{2}$/.test(albumDate)) {
    return Response.json({ error: 'Invalid event date.' }, { status: 400 })
  }
  const re = pathRegexFor(user.id)
  if (!re.test(originalPath || '') || !re.test(displayPath || '')) {
    return Response.json({ error: 'Invalid storage path.' }, { status: 400 })
  }

  const [origExists, dispExists] = await Promise.all([
    objectExists({ bucket: BUCKET, path: originalPath }),
    objectExists({ bucket: BUCKET, path: displayPath }),
  ])
  if (!origExists || !dispExists) return Response.json({ error: 'Upload incomplete — please retry.' }, { status: 400 })

  const { count: pendingCount } = await admin.from('gallery_photo_submissions')
    .select('id', { count: 'exact', head: true }).eq('member_id', user.id).eq('status', 'pending')
  if ((pendingCount || 0) >= MAX_PENDING_PER_MEMBER) {
    return Response.json({ error: 'You have too many photos awaiting review — wait for some to be published before submitting more.' }, { status: 429 })
  }

  const originalUrl = getPublicUrl({ bucket: BUCKET, path: originalPath })
  const displayUrl = getPublicUrl({ bucket: BUCKET, path: displayPath })

  const { data: row, error } = await admin.from('gallery_photo_submissions').insert({
    source: 'member',
    member_id: user.id,
    contributor_name: member.name || member.email,
    album,
    album_date: albumDate || null,
    caption,
    photo_url: displayUrl,
    storage_path: displayPath,
    original_path: originalPath,
    original_url: originalUrl,
  }).select('id').single()

  if (error) {
    captureException(error, { context: 'member-gallery-submission-insert', memberId: user.id })
    return Response.json({ error: 'Photo uploaded but could not be saved. Please try again.' }, { status: 500 })
  }

  return Response.json({ id: row.id })
}
