import { createAdminClient } from '../../../../lib/supabase/admin'
import { createClient } from '../../../../lib/supabase/server'
import { checkRateLimit } from '../../../../lib/rateLimit.js'

function validate(password) {
  if (!password || password.length < 8) return 'Password must be at least 8 characters.'
  if (password.length > 72) return 'Password must be under 72 characters.'
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.'
  return null
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
  if (ip && await checkRateLimit(ip)) {
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

  // Try token-based auth first (invite / implicit flow)
  if (accessToken) {
    const { data: { user } } = await admin.auth.getUser(accessToken)
    userId = user?.id
  }

  // Fall back to cookie-based session (PKCE / forgot-password flow)
  if (!userId) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id
  }

  if (!userId) return Response.json({ error: 'Session expired. Please request a new link.' }, { status: 401 })

  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await admin.from('members')
    .update({ membership_status: 'active', password_set_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('membership_status', 'pending')

  return Response.json({ success: true })
}
