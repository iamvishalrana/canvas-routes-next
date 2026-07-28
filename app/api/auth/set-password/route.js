import { createAdminClient } from '../../../../lib/supabase/admin'
import { createClient } from '../../../../lib/supabase/server'
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit.js'

function validate(password) {
  if (!password || password.length < 8) return 'Password must be at least 8 characters.'
  if (password.length > 72) return 'Password must be under 72 characters.'
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.'
  return null
}

export async function POST(request) {
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 10, 60)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const { password, accessToken } = body
  const err = validate(password)
  if (err) return Response.json({ error: err }, { status: 400 })

  const admin = createAdminClient()
  let userId = null
  let resolvedToken = null

  // Try token-based auth first (invite / implicit flow)
  if (accessToken) {
    const { data: { user } } = await admin.auth.getUser(accessToken)
    if (user) { userId = user.id; resolvedToken = accessToken }
  }

  // Fall back to cookie-based session (PKCE / forgot-password flow)
  if (!userId) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
      const { data: { session } } = await supabase.auth.getSession()
      resolvedToken = session?.access_token || null
    }
  }

  if (!userId) return Response.json({ error: 'Session expired. Please request a new link.' }, { status: 401 })

  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Revoke every session for this account, including the recovery/invite
  // token just used — the page redirects to a fresh login right after this,
  // so nothing relies on that token staying valid, and this is what actually
  // locks out anyone who had unauthorized access (the usual reason someone
  // resets their password) instead of leaving their session valid.
  if (resolvedToken) {
    await admin.auth.admin.signOut(resolvedToken, 'global').catch(() => {})
  }

  await admin.from('members')
    .update({ membership_status: 'active', password_set_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('membership_status', 'pending')

  return Response.json({ success: true })
}
