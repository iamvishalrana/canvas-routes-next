import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit.js'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 5, 60)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const { password, currentPassword } = await request.json()
  if (!password || password.length < 8) return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  if (password.length > 72) return Response.json({ error: 'Password must be under 72 characters.' }, { status: 400 })
  if (!/[A-Z]/.test(password)) return Response.json({ error: 'Password must include at least one uppercase letter.' }, { status: 400 })
  if (!/[0-9]/.test(password)) return Response.json({ error: 'Password must include at least one number.' }, { status: 400 })

  // Require re-proving the current password before changing it — otherwise
  // anyone with momentary access to an already-logged-in session (stolen
  // cookie, unattended device, XSS) could silently lock the real owner out
  // by changing the password with no further verification. The
  // forgot-password flow (app/api/auth/set-password) is the correct path for
  // someone who genuinely doesn't know their current password — it's
  // protected by the emailed recovery token instead of this check.
  if (!currentPassword) return Response.json({ error: 'Current password is required.' }, { status: 400 })
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
  if (verifyError) return Response.json({ error: 'Current password is incorrect.' }, { status: 401 })

  // Capture the current session's token before updateUser() has a chance to
  // rotate it — this is the "except this one" reference for the sign-out
  // call below, so the session that just legitimately changed the password
  // doesn't get logged out along with everyone else.
  const { data: { session } } = await supabase.auth.getSession()

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const admin = createAdminClient()

  // Sign out every other session for this account — if a stolen/leaked
  // session was the reason for changing the password, this is what actually
  // revokes it instead of leaving it valid until it happens to expire.
  if (session?.access_token) {
    await admin.auth.admin.signOut(session.access_token, 'others').catch(() => {})
  }

  // Stamp password_set_at if it was never set (e.g. password set via a
  // recovery flow) — the admin panel shows "Awaiting" and keeps offering
  // re-invites until this is non-null
  try {
    await admin.from('members')
      .update({ password_set_at: new Date().toISOString() })
      .eq('id', user.id)
      .is('password_set_at', null)
  } catch {}

  return Response.json({ success: true })
}
