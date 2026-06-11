import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'

export async function GET(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const audience = new URL(request.url).searchParams.get('audience')
  if (!audience) return Response.json({ error: 'audience required' }, { status: 400 })

  const supabase = createAdminClient()

  try {
    let count = 0

    if (audience === 'canvas_routes_member') {
      const { count: c } = await supabase.from('members').select('*', { count: 'exact', head: true })
        .eq('membership_status', 'active').eq('tier', 'routes_member')
      count = c || 0
    } else if (audience === 'inner_circle') {
      const { count: c } = await supabase.from('members').select('*', { count: 'exact', head: true })
        .eq('membership_status', 'active').eq('tier', 'inner_circle')
      count = c || 0
    } else if (audience === 'all_active_members') {
      const { count: c } = await supabase.from('members').select('*', { count: 'exact', head: true })
        .eq('membership_status', 'active')
      count = c || 0
    } else if (audience === 'pending_members') {
      const { count: c } = await supabase.from('members').select('*', { count: 'exact', head: true })
        .eq('membership_status', 'pending')
      count = c || 0
    } else if (audience === 'all_contacts') {
      const { count: c } = await supabase.from('contacts').select('*', { count: 'exact', head: true })
      count = c || 0
    } else if (audience === 'contacts_non_members') {
      const { data: members } = await supabase.from('members').select('email').eq('membership_status', 'active')
      const memberEmails = new Set((members || []).map(m => m.email?.toLowerCase()))
      const { data: contacts } = await supabase.from('contacts').select('applications(email)')
      count = (contacts || []).filter(c => {
        const email = c.applications?.email?.toLowerCase()
        return email && !memberEmails.has(email)
      }).length
    } else if (audience === 'everyone') {
      const [{ data: members }, { data: contacts }] = await Promise.all([
        supabase.from('members').select('email').eq('membership_status', 'active'),
        supabase.from('contacts').select('applications(email)'),
      ])
      const seen = new Set()
      for (const m of (members || [])) if (m.email) seen.add(m.email.toLowerCase())
      for (const c of (contacts || [])) {
        const e = c.applications?.email?.toLowerCase()
        if (e) seen.add(e)
      }
      count = seen.size
    }

    return Response.json({ count })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
