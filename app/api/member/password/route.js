import { createClient } from '../../../../lib/supabase/server'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { password } = await request.json()
  if (!password || password.length < 8) return Response.json({ error: 'Minimum 8 characters.' }, { status: 400 })
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
