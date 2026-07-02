import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { password } = await request.json()
  if (!password || password.length < 8) return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  if (password.length > 72) return Response.json({ error: 'Password must be under 72 characters.' }, { status: 400 })
  if (!/[A-Z]/.test(password)) return Response.json({ error: 'Password must include at least one uppercase letter.' }, { status: 400 })
  if (!/[0-9]/.test(password)) return Response.json({ error: 'Password must include at least one number.' }, { status: 400 })
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Stamp password_set_at if it was never set (e.g. password set via a
  // recovery flow) — the admin panel shows "Awaiting" and keeps offering
  // re-invites until this is non-null
  try {
    const admin = createAdminClient()
    await admin.from('members')
      .update({ password_set_at: new Date().toISOString() })
      .eq('id', user.id)
      .is('password_set_at', null)
  } catch {}

  return Response.json({ success: true })
}
