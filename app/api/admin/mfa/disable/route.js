import { cookies } from 'next/headers'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { captureException } from '../../../../../lib/sentry'
import { ADMIN_MFA_COOKIE_NAME } from '../../../../../lib/adminMfa'

// No code re-verification required to disable — an active authenticated
// admin session is sufficient authority, consistent with this being a
// self-serve/opt-in feature rather than an enforced one.
export async function POST() {
  const user = await requireAdmin()
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data: existing, error: readErr } = await admin.auth.admin.getUserById(user.id)
  if (readErr) {
    captureException(readErr, { context: 'admin-mfa-disable-read-metadata' })
    return Response.json({ error: 'Something went wrong. Please try again in a moment.' }, { status: 500 })
  }
  const { error: writeErr } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...(existing?.user?.app_metadata || {}), mfa_enabled: false },
  })
  if (writeErr) {
    captureException(writeErr, { context: 'admin-mfa-disable-write-metadata' })
    return Response.json({ error: 'Something went wrong. Please try again in a moment.' }, { status: 500 })
  }

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_MFA_COOKIE_NAME, '', { path: '/', maxAge: 0 })
  return Response.json({ ok: true })
}
