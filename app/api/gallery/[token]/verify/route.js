import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'

const BUCKET = 'photo-shares'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Public, rate-limited password check for a shared gallery — the person's
// email IS the password (see the admin Non-Member Shares pages). One token
// covers every one of their event folders, so a successful match returns
// all of them (minus any that have already expired) rather than a single
// flat photo list. Never reveals whether a token exists or what the
// expected email is; a mismatch and a not-found token return the identical
// response. Only returns photo URLs once the email actually matches.
export async function POST(request, { params }) {
  const { token } = await params
  const ip = getClientIp(request)
  // Tight limit — this is a guessing target (the "password" is a real email
  // that may follow a predictable pattern), keep brute-forcing impractical.
  if (await checkRateLimit(ip, 8, 60)) {
    return Response.json({ error: 'Too many attempts. Please try again in a minute.' }, { status: 429 })
  }

  const { email } = await request.json().catch(() => ({}))
  const entered = normalizeEmail(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entered)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: person } = UUID_RE.test(token)
    ? await admin.from('photo_share_people').select('id, name, email').eq('token', token).maybeSingle()
    : { data: null }

  const mismatch = () => Response.json({ error: "That email doesn't match this gallery." }, { status: 403 })
  if (!person) return mismatch()
  if (normalizeEmail(person.email) !== entered) return mismatch()

  const { data: folders } = await admin.from('photo_share_folders')
    .select('id, title, expires_at').eq('person_id', person.id)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  const folderIds = (folders || []).map(f => f.id)
  const { data: items } = folderIds.length
    ? await admin.from('photo_share_items').select('id, folder_id, storage_path, original_path').in('folder_id', folderIds)
    : { data: [] }

  const itemsByFolder = new Map()
  for (const i of (items || [])) {
    if (!itemsByFolder.has(i.folder_id)) itemsByFolder.set(i.folder_id, [])
    const { data: { publicUrl: url } } = admin.storage.from(BUCKET).getPublicUrl(i.storage_path)
    const { data: { publicUrl: originalUrl } } = admin.storage.from(BUCKET).getPublicUrl(i.original_path || i.storage_path)
    itemsByFolder.get(i.folder_id).push({ id: i.id, url, originalUrl, caption: null })
  }

  const resultFolders = (folders || []).map(f => ({
    id: f.id, title: f.title, expiresAt: f.expires_at, photos: itemsByFolder.get(f.id) || [],
  }))

  return Response.json({ name: person.name, folders: resultFolders })
}
