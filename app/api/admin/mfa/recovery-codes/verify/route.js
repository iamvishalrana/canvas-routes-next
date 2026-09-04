import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { verifyRecoveryCode } from '../../../../../../lib/adminMfaRecovery'
import { mintAdminMfaSession } from '../../../../../../lib/adminMfaSession'
import { alertRecoveryUsed } from '../../../../../../lib/adminMfaAlert'
import { checkRateLimit, getClientIp } from '../../../../../../lib/rateLimit'
import { captureException } from '../../../../../../lib/sentry'

// Challenge-completion route — exempt from the MFA gate (an admin using a
// recovery code hasn't verified yet) but still requireAdmin-gated (they've
// passed the password step). Single-use consumes the code on success and mints
// the MFA session cookie, then fires a security alert to the admin's inboxes.
export async function POST(request) {
  const user = await requireAdmin()
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 10, 60, 'admin-mfa-recovery-code')) {
    return Response.json({ error: 'Too many attempts. Please wait a moment and try again.' }, { status: 429 })
  }

  const { code } = await request.json().catch(() => ({}))
  if (!code || typeof code !== 'string') {
    return Response.json({ error: 'Enter a recovery code.' }, { status: 400 })
  }

  try {
    const ok = await verifyRecoveryCode(user.id, code)
    if (!ok) return Response.json({ error: 'That recovery code is invalid or has already been used.' }, { status: 400 })
    await mintAdminMfaSession(user.id, user.email)
    alertRecoveryUsed({ user, method: 'a recovery code' })
    return Response.json({ ok: true })
  } catch (err) {
    captureException(err, { context: 'admin-mfa-recovery-code-verify' })
    return Response.json({ error: 'Something went wrong. Please try again in a moment.' }, { status: 500 })
  }
}
