import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkCode } from '../../../../../lib/otp'
import { captureException } from '../../../../../lib/sentry'
import { mintAdminMfaSession } from '../../../../../lib/adminMfaSession'

// Verifies the code sent by send-code/route.js. Handles both first-time
// enrollment and every later login re-challenge identically: a successful
// check always (a) marks MFA enabled on the account — a no-op if it already
// was — and (b) mints a fresh session cookie, since proving control of the
// code sent to your own account email means the same thing either way.
// useRecovery mirrors send-code/route.js: checks the code against the
// account's own (trusted, server-read) recovery email instead of the
// primary one, but the resulting session is still tied to user.id/user.email
// either way — the delivery channel doesn't change what the session means.
export async function POST(request) {
  const user = await requireAdmin()
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { code, useRecovery } = await request.json().catch(() => ({}))
  const candidate = String(code ?? '').trim()
  if (!/^\d{6}$/.test(candidate)) {
    return Response.json({ error: 'Please enter the 6-digit code.' }, { status: 400 })
  }

  let target = user.email
  if (useRecovery) {
    target = user.app_metadata?.mfa_recovery_email
    if (!target) return Response.json({ error: 'No recovery email is set on this account.' }, { status: 400 })
  }

  const result = await checkCode(user.id, target, candidate)
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

  await mintAdminMfaSession(user.id, user.email)
  return Response.json({ ok: true })
}
