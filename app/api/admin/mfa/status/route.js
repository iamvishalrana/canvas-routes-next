import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { getRecoveryStatus } from '../../../../../lib/adminMfaRecovery'

export async function GET() {
  const user = await requireAdmin()
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })
  // Recovery status is counts/booleans only (never hashes or answers) and must
  // never break the Settings card if the read fails — fall back to "none".
  let rec = { recoveryCodesRemaining: 0, securityQuestionsSet: false }
  try { rec = await getRecoveryStatus(user.id) } catch {}
  return Response.json({
    enabled: !!user.app_metadata?.mfa_enabled,
    email: user.email,
    recoveryEmail: user.app_metadata?.mfa_recovery_email || null,
    recoveryCodesRemaining: rec.recoveryCodesRemaining,
    securityQuestionsSet: rec.securityQuestionsSet,
  })
}
