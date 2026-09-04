import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { setSecurityQuestions } from '../../../../../../lib/adminMfaRecovery'
import { captureException } from '../../../../../../lib/sentry'

// Setup route — NOT exempted from the MFA gate, so security questions can only
// be set/changed after a full challenge (an attacker with just the password
// can't plant their own answers). Answers are hashed in setSecurityQuestions;
// nothing plaintext is stored or logged.
export async function POST(request) {
  const user = await requireAdmin()
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { questions } = await request.json().catch(() => ({}))
  try {
    await setSecurityQuestions(user.id, questions)
    return Response.json({ ok: true })
  } catch (err) {
    // setSecurityQuestions throws Error with a user-facing message for bad
    // input (count/shape/too-short); treat those as 400, anything else as 500.
    const known = /required|filled in|at least/i.test(err?.message || '')
    if (!known) captureException(err, { context: 'admin-mfa-security-questions-set' })
    return Response.json({ error: known ? err.message : 'Could not save security questions. Please try again.' }, { status: known ? 400 : 500 })
  }
}
