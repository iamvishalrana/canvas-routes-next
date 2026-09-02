import { cookies } from 'next/headers'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkCode, createSession } from '../../../../../lib/otp'
import { captureException } from '../../../../../lib/sentry'
import { ADMIN_MFA_COOKIE_NAME, ADMIN_MFA_SESSION_TTL_SEC } from '../../../../../lib/adminMfa'

// Verifies the code sent by send-code/route.js. Handles both first-time
// enrollment and every later login re-challenge identically: a successful
// check always (a) marks MFA enabled on the account — a no-op if it already
// was — and (b) mints a fresh session cookie, since proving control of the
// code sent to your own account email means the same thing either way.
export async function POST(request) {
  const user = await requireAdmin()
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { code } = await request.json().catch(() => ({}))
  const candidate = String(code ?? '').trim()
  if (!/^\d{6}$/.test(candidate)) {
    return Response.json({ error: 'Please enter the 6-digit code.' }, { status: 400 })
  }

  const result = await checkCode(user.id, user.email, candidate)
  if (result === 'invalid') return Response.json({ error: 'Incorrect code. Please try again.' }, { status: 400 })
  if (result === 'expired') return Response.json({ error: 'That code has expired. Request a new one.' }, { status: 400 })
  if (result === 'locked') return Response.json({ error: 'Too many incorrect attempts. Request a new code.' }, { status: 400 })
  if (result === 'error') {
    captureException(new Error('admin MFA code check errored'), { context: 'admin-mfa-verify' })
    return Response.json({ error: 'Something went wrong. Please try again in a moment.' }, { status: 500 })
  }

  const admin = createAdminClient()
  // Read-then-spread rather than trusting updateUserById's merge semantics,
  // so any other app_metadata key set on this user in the future is never
  // silently dropped by this route.
  const { data: existing, error: readErr } = await admin.auth.admin.getUserById(user.id)
  if (readErr) {
    captureException(readErr, { context: 'admin-mfa-verify-read-metadata' })
    return Response.json({ error: 'Something went wrong. Please try again in a moment.' }, { status: 500 })
  }
  const { error: writeErr } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...(existing?.user?.app_metadata || {}), mfa_enabled: true },
  })
  if (writeErr) {
    captureException(writeErr, { context: 'admin-mfa-verify-write-metadata' })
    return Response.json({ error: 'Something went wrong. Please try again in a moment.' }, { status: 500 })
  }

  const sessionId = await createSession(user.id, user.email, ADMIN_MFA_SESSION_TTL_SEC)
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_MFA_COOKIE_NAME, sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_MFA_SESSION_TTL_SEC,
  })
  return Response.json({ ok: true })
}
