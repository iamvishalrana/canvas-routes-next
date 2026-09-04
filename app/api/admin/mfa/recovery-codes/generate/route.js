import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { generateRecoveryCodes } from '../../../../../../lib/adminMfaRecovery'
import { captureException } from '../../../../../../lib/sentry'

// Setup route — deliberately NOT exempted from the MFA gate in middleware.js,
// so an admin can only (re)generate recovery codes AFTER passing a full
// challenge. Prevents someone with just the password from minting themselves a
// set of recovery codes. Returns the plaintext codes ONCE; only hashes are
// stored, and regenerating invalidates any previous set.
export async function POST() {
  const user = await requireAdmin()
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const codes = await generateRecoveryCodes(user.id)
    return Response.json({ ok: true, codes })
  } catch (err) {
    captureException(err, { context: 'admin-mfa-recovery-codes-generate' })
    return Response.json({ error: 'Could not generate recovery codes. Please try again.' }, { status: 500 })
  }
}
