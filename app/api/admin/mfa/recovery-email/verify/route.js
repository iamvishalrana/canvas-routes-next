import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { checkCode } from '../../../../../../lib/otp'
import { normalizeEmail } from '../../../../../../lib/normalizeEmail'
import { isValidEmail } from '../../../../../../lib/emailValidation'
import { captureException } from '../../../../../../lib/sentry'

// Step 2: confirms the code sent by recovery-email/send-code/route.js, then
// (only on success) saves the address to app_metadata.mfa_recovery_email.
export async function POST(request) {
  const user = await requireAdmin()
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { email, code } = await request.json().catch(() => ({}))
  const candidate = normalizeEmail(email)
  const otpCandidate = String(code ?? '').trim()
  if (!isValidEmail(candidate) || !/^\d{6}$/.test(otpCandidate)) {
    return Response.json({ error: 'Please enter the 6-digit code.' }, { status: 400 })
  }

  const result = await checkCode(user.id, candidate, otpCandidate)
  if (result === 'invalid') return Response.json({ error: 'Incorrect code. Please try again.' }, { status: 400 })
  if (result === 'expired') return Response.json({ error: 'That code has expired. Request a new one.' }, { status: 400 })
  if (result === 'locked') return Response.json({ error: 'Too many incorrect attempts. Request a new code.' }, { status: 400 })
  if (result === 'error') {
    captureException(new Error('admin MFA recovery-email code check errored'), { context: 'admin-mfa-recovery-verify' })
    return Response.json({ error: 'Something went wrong. Please try again in a moment.' }, { status: 500 })
  }

  const admin = createAdminClient()
  const { data: existing, error: readErr } = await admin.auth.admin.getUserById(user.id)
  if (readErr) {
    captureException(readErr, { context: 'admin-mfa-recovery-verify-read-metadata' })
    return Response.json({ error: 'Something went wrong. Please try again in a moment.' }, { status: 500 })
  }
  const { error: writeErr } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...(existing?.user?.app_metadata || {}), mfa_recovery_email: candidate },
  })
  if (writeErr) {
    captureException(writeErr, { context: 'admin-mfa-recovery-verify-write-metadata' })
    return Response.json({ error: 'Something went wrong. Please try again in a moment.' }, { status: 500 })
  }

  return Response.json({ ok: true, recoveryEmail: candidate })
}
