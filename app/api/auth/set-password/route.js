import { createAdminClient } from '../../../../lib/supabase/admin'

function validate(password) {
  if (!password || password.length < 8) return 'Password must be at least 8 characters.'
  if (password.length > 72) return 'Password must be under 72 characters.'
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.'
  return null
}

export async function POST(request) {
  const { password, accessToken } = await request.json()
  const err = validate(password)
  if (err) return Response.json({ error: err }, { status: 400 })
  if (!accessToken) return Response.json({ error: 'Missing session token.' }, { status: 401 })

  const admin = createAdminClient()
  const { data: { user }, error: userErr } = await admin.auth.getUser(accessToken)
  if (userErr || !user) return Response.json({ error: 'Session expired. Please request a new invite.' }, { status: 401 })

  const { error } = await admin.auth.admin.updateUserById(user.id, { password })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
