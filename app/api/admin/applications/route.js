import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'

export async function GET(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')?.toLowerCase().trim()
  const supabase = createAdminClient()

  // Single lookup (used by invite auto-fill)
  if (email) {
    const { data } = await supabase.from('applications').select('*').eq('email', email).maybeSingle()
    return Response.json(data || null)
  }

  // All applications with is_member flag
  const [appsResult, membersResult, contactsResult] = await Promise.all([
    supabase.from('applications').select('*').order('created_at', { ascending: false }),
    supabase.from('members').select('email'),
    supabase.from('contacts').select('application_id'),
  ])
  const memberEmails = new Set((membersResult.data || []).map(m => m.email?.toLowerCase()))
  const contactAppIds = new Set((contactsResult.data || []).map(c => c.application_id))
  const apps = (appsResult.data || []).map(a => ({
    ...a,
    is_member: memberEmails.has(a.email?.toLowerCase()),
    is_contact: contactAppIds.has(a.id),
  }))
  return Response.json(apps)
}
