import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { verifySecurityQuestions } from '../../../../../../lib/adminMfaRecovery'
import { mintAdminMfaSession } from '../../../../../../lib/adminMfaSession'
import { alertRecoveryUsed } from '../../../../../../lib/adminMfaAlert'
import { checkRateLimit, getClientIp } from '../../../../../../lib/rateLimit'
import { captureException } from '../../../../../../lib/sentry'

// Challenge-completion route — exempt from the MFA gate, requireAdmin-gated.
// Requires ALL answers correct; verifySecurityQuestions enforces a 5-attempt
// lockout on top of this per-IP rate limit. On success mints the MFA session
// and alerts the admin's inboxes.
export async function POST(request) {
  const user = await requireAdmin()
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 10, 60, 'admin-mfa-sq')) {
    return Response.json({ error: 'Too many attempts. Please wait a moment and try again.' }, { status: 429 })
  }

  const { answers } = await request.json().catch(() => ({}))
  try {
    const result = await verifySecurityQuestions(user.id, answers)
    if (result.ok) {
      await mintAdminMfaSession(user.id, user.email)
      alertRecoveryUsed({ user, method: 'security questions' })
      return Response.json({ ok: true })
    }
    if (result.notConfigured) return Response.json({ error: 'No security questions are set on this account.' }, { status: 400 })
    if (result.locked) return Response.json({ error: 'Too many incorrect attempts — try again in about 15 minutes.' }, { status: 429 })
    const n = result.remainingAttempts
    return Response.json({ error: `Incorrect. ${n} attempt${n === 1 ? '' : 's'} left before a temporary lock.` }, { status: 400 })
  } catch (err) {
    captureException(err, { context: 'admin-mfa-security-questions-verify' })
    return Response.json({ error: 'Something went wrong. Please try again in a moment.' }, { status: 500 })
  }
}
