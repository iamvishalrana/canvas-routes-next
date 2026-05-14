import { createClient } from '../../../../lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: member } = await supabase.from('members').select('*').eq('id', user.id).single()
  return Response.json({ user: { id: user.id, email: user.email }, member: member || null })
}
