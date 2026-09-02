import { requireAdmin } from '../../../../../lib/supabase/authCheck'

export async function GET() {
  const user = await requireAdmin()
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })
  return Response.json({
    enabled: !!user.app_metadata?.mfa_enabled,
    email: user.email,
    recoveryEmail: user.app_metadata?.mfa_recovery_email || null,
  })
}
