import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  const { data: member } = await admin.from('members').select('*').eq('id', user.id).maybeSingle()
  return Response.json({ user: { id: user.id, email: user.email }, member: member || null })
}
