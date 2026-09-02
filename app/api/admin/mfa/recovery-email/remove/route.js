import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry'

// No code re-verification required to remove — same reasoning as disabling
// MFA itself: an active authenticated admin session is sufficient, and
// removing only shrinks the account's attack surface.
export async function POST() {
  const user = await requireAdmin()
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data: existing, error: readErr } = await admin.auth.admin.getUserById(user.id)
  if (readErr) {
    captureException(readErr, { context: 'admin-mfa-recovery-remove-read-metadata' })
    return Response.json({ error: 'Something went wrong. Please try again in a moment.' }, { status: 500 })
  }
  const rest = { ...(existing?.user?.app_metadata || {}) }
  delete rest.mfa_recovery_email
  const { error: writeErr } = await admin.auth.admin.updateUserById(user.id, { app_metadata: rest })
  if (writeErr) {
    captureException(writeErr, { context: 'admin-mfa-recovery-remove-write-metadata' })
    return Response.json({ error: 'Something went wrong. Please try again in a moment.' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
