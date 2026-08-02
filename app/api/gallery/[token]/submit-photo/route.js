import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'
import { readSession } from '../../../../../lib/otp'
import { captureException } from '../../../../../lib/sentry'
import { ALLOWED_EXTS } from '../../../../../lib/allowedImageTypes'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BUCKET = 'photo-shares'
// Ceiling on how many un-reviewed submissions one person can have sitting in
// the queue at once, across all their folders — see the matching comment in
// app/api/member/gallery-submission/route.js for why this exists.
const MAX_PENDING_PER_PERSON = 50

function pathRegexFor(personId, folderId) {
  return new RegExp(`^submissions/${personId}/${folderId}/(originals|display)/[\\w-]+\\.(${ALLOWED_EXTS.join('|')})$`)
}

// Records a non-member's self-submitted photo into the staging table — never
// photo_share_items directly. Stays invisible (even to the submitter) until
// an admin publishes it from /admin/photos/submissions.
export async function POST(request, { params }) {
  const { token } = await params
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 60, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })
  if (!UUID_RE.test(token)) return Response.json({ error: 'Not found.' }, { status: 404 })

  const { sessionId, folderId, originalPath, displayPath, caption: rawCaption } = await request.json().catch(() => ({}))
  const caption = (rawCaption || '').toString().trim().slice(0, 300) || null
  const email = await readSession(token, sessionId)
  if (!email) return Response.json({ error: 'Session expired.' }, { status: 401 })

  const admin = createAdminClient()
  const { data: person } = await admin.from('photo_share_people').select('id, name, email').eq('token', token).maybeSingle()
  if (!person || normalizeEmail(person.email) !== email) return Response.json({ error: 'Session expired.' }, { status: 401 })

  const { data: folder } = await admin.from('photo_share_folders').select('id').eq('id', folderId).eq('person_id', person.id).maybeSingle()
  if (!folder) return Response.json({ error: 'Folder not found.' }, { status: 404 })

  const re = pathRegexFor(person.id, folder.id)
  if (!re.test(originalPath || '') || !re.test(displayPath || '')) {
    return Response.json({ error: 'Invalid storage path.' }, { status: 400 })
  }

  const [{ data: origExists }, { data: dispExists }] = await Promise.all([
    admin.storage.from(BUCKET).exists(originalPath),
    admin.storage.from(BUCKET).exists(displayPath),
  ])
  if (!origExists || !dispExists) return Response.json({ error: 'Upload incomplete — please retry.' }, { status: 400 })

  const { data: personFolders } = await admin.from('photo_share_folders').select('id').eq('person_id', person.id)
  const folderIds = (personFolders || []).map(f => f.id)
  const { count: pendingCount } = folderIds.length
    ? await admin.from('gallery_photo_submissions').select('id', { count: 'exact', head: true }).in('photo_share_folder_id', folderIds).eq('status', 'pending')
    : { count: 0 }
  if ((pendingCount || 0) >= MAX_PENDING_PER_PERSON) {
    return Response.json({ error: 'Too many photos awaiting review — wait for some to be published before submitting more.' }, { status: 429 })
  }

  const { data: { publicUrl: originalUrl } } = admin.storage.from(BUCKET).getPublicUrl(originalPath)
  const { data: { publicUrl: displayUrl } } = admin.storage.from(BUCKET).getPublicUrl(displayPath)

  const { data: row, error } = await admin.from('gallery_photo_submissions').insert({
    source: 'non_member',
    photo_share_folder_id: folder.id,
    contributor_name: person.name || person.email,
    caption,
    photo_url: displayUrl,
    storage_path: displayPath,
    original_path: originalPath,
    original_url: originalUrl,
  }).select('id').single()

  if (error) {
    captureException(error, { context: 'gallery-submit-photo-insert', personId: person.id, folderId: folder.id })
    return Response.json({ error: 'Photo uploaded but could not be saved. Please try again.' }, { status: 500 })
  }

  return Response.json({ id: row.id })
}
