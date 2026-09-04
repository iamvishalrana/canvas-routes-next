import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { getRecoveryStatus } from '../../../../../lib/adminMfaRecovery'

// Tells the challenge page which recovery methods this admin has, WITHOUT
// sending an email (unlike send-code) — so the fallbacks are still discoverable
// exactly when the primary email channel is down/rate-limited. Exempt from the
// MFA gate in middleware.js (an admin mid-challenge hasn't verified yet), but
// still requireAdmin-gated. Returns only non-secret info: the question texts,
// never hashes or answers.
export async function GET() {
  const user = await requireAdmin()
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const rec = await getRecoveryStatus(user.id)
    return Response.json({
      email: user.email,
      hasRecoveryEmail: !!user.app_metadata?.mfa_recovery_email,
      hasRecoveryCodes: rec.recoveryCodesRemaining > 0,
      securityQuestions: rec.securityQuestionsSet ? rec.securityQuestions : null,
    })
  } catch {
    // Never block the challenge on a recovery-status read failure — the primary
    // email code still works; just report no fallbacks rather than erroring.
    return Response.json({ email: user.email, hasRecoveryEmail: !!user.app_metadata?.mfa_recovery_email, hasRecoveryCodes: false, securityQuestions: null })
  }
}
