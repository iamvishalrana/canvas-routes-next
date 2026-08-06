import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'
import { readSession } from '../../../../../lib/otp'
import { loadPersonFolders } from '../../../../../lib/gallerySharePhotos'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Silent re-entry for a device that already passed the email+code gate
// (see request-code and verify-code, the two routes that make up the actual
// OTP flow). The client sends back the opaque sessionId it stored in
// localStorage after a successful verify-code call; this route confirms that
// session id is real, unexpired, and minted for THIS exact token — it is
// never valid proof for a different gallery link — before handing back
// photos again with no code re-entry required. A missing/expired/foreign
// session just falls through to the normal email+code gate on the client.
export async function POST(request, { params }) {
  const { token } = await params
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 20, 60, 'gallery-verify')) {
    return Response.json({ error: 'Too many requests.' }, { status: 429 })
  }
  if (!UUID_RE.test(token)) {
    return Response.json({ error: 'Not found.' }, { status: 404 })
  }

  const { sessionId } = await request.json().catch(() => ({}))
  const email = await readSession(token, sessionId)
  if (!email) return Response.json({ error: 'Session expired.' }, { status: 401 })

  const admin = createAdminClient()
  const { data: person } = await admin.from('photo_share_people').select('id, name, email').eq('token', token).maybeSingle()
  if (!person || normalizeEmail(person.email) !== email) {
    return Response.json({ error: 'Session expired.' }, { status: 401 })
  }

  const folders = await loadPersonFolders(admin, person)
  return Response.json({ name: person.name, folders })
}
