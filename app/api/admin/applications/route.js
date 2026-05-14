import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'

export async function GET(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')?.toLowerCase().trim()
  if (!email) return Response.json(null)
  const supabase = createAdminClient()
  const { data } = await supabase.from('applications').select('*').eq('email', email).maybeSingle()
  return Response.json(data || null)
}
