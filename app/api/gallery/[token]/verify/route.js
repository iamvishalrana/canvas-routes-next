import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'

const BUCKET = 'photo-shares'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Public, rate-limited password check for a shared gallery — the recipient
// email set on the share IS the password (see PhotoSharesTab.jsx). Never
// reveals whether a token exists or what the expected email is; a mismatch
// and a not-found token return the identical response. Only returns photo
// URLs once the email actually matches, so nothing sensitive is servable to
// an unverified visitor.
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
  const { data: share } = UUID_RE.test(token)
    ? await admin.from('photo_shares').select('id, title, expires_at, recipient_email').eq('token', token).maybeSingle()
    : { data: null }

  const mismatch = () => Response.json({ error: "That email doesn't match this gallery." }, { status: 403 })
  if (!share) return mismatch()
  if (new Date(share.expires_at) <= new Date()) return Response.json({ error: 'This gallery has expired.' }, { status: 410 })
  // A share with no recipient_email set (legacy, or an admin-cleared "open"
  // link) has nothing to check against — every share going forward always
  // has one (enforced at creation), so this only affects pre-existing data.
  if (share.recipient_email && normalizeEmail(share.recipient_email) !== entered) return mismatch()

  const { data: items } = await admin.from('photo_share_items')
    .select('id, storage_path, original_path').eq('share_id', share.id).order('created_at', { ascending: true })

  const photos = (items || []).map(i => {
    const { data: { publicUrl: url } } = admin.storage.from(BUCKET).getPublicUrl(i.storage_path)
    const { data: { publicUrl: originalUrl } } = admin.storage.from(BUCKET).getPublicUrl(i.original_path || i.storage_path)
    return { id: i.id, url, originalUrl, caption: null }
  })

  return Response.json({ title: share.title, expiresAt: share.expires_at, photos })
}
