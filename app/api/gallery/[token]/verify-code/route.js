import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'
import { checkCode, createSession } from '../../../../../lib/otp'
import { loadPersonFolders } from '../../../../../lib/gallerySharePhotos'
import { captureException } from '../../../../../lib/sentry'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Step 2 of the gallery gate: checks the 6-digit code sent by
// request-code/route.js. On success, mints an opaque session id (see
// lib/otp.js createSession) the client stores in localStorage so this device
// isn't asked for a new code on every return visit — that session id is the
// actual proof of a passed OTP check, unlike the old flow which just
// remembered the typed email itself.
export async function POST(request, { params }) {
  const { token } = await params
  const ip = getClientIp(request)
  // Looser than request-code's limit — wrong-code retries are expected during
  // normal typos, but still bounded; the per-code MAX_ATTEMPTS in lib/otp.js
  // does the real brute-force defense.
  if (await checkRateLimit(ip, 15, 60)) {
    return Response.json({ error: 'Too many attempts. Please try again in a minute.' }, { status: 429 })
  }
  if (!UUID_RE.test(token)) {
    return Response.json({ error: 'Invalid or expired code.' }, { status: 400 })
  }

  const { email, code } = await request.json().catch(() => ({}))
  const entered = normalizeEmail(email)
  const candidate = String(code ?? '').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entered) || !/^\d{6}$/.test(candidate)) {
    return Response.json({ error: 'Please enter the 6-digit code.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: person } = await admin.from('photo_share_people').select('id, name, email').eq('token', token).maybeSingle()
  // Same non-enumerating shape as request-code — an unknown token/email pair
  // and a wrong code both just read as "invalid or expired" to the visitor.
  if (!person || normalizeEmail(person.email) !== entered) {
    return Response.json({ error: 'Invalid or expired code.' }, { status: 400 })
  }

  const result = await checkCode(token, entered, candidate)
  if (result === 'invalid') return Response.json({ error: 'Incorrect code. Please try again.' }, { status: 400 })
  if (result === 'expired') return Response.json({ error: 'That code has expired. Request a new one.' }, { status: 400 })
  if (result === 'locked') return Response.json({ error: 'Too many incorrect attempts. Request a new code.' }, { status: 400 })
  if (result === 'error') {
    // Genuinely ambiguous (e.g. a transient Redis blip) — not the visitor's
    // mistake, so don't tell them the code was wrong or expired; ask them to
    // just retry the same code rather than burning a resend on our own hiccup.
    captureException(new Error('gallery OTP check errored'), { context: 'gallery-verify-code', token })
    return Response.json({ error: 'Something went wrong. Please try again in a moment.' }, { status: 500 })
  }

  const sessionId = await createSession(token, entered)
  const folders = await loadPersonFolders(admin, person)
  return Response.json({ sessionId, name: person.name, folders })
}
