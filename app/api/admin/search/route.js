import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../lib/supabase/admin'

export async function GET(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return Response.json({ members: [], applications: [], contacts: [] })

  const supabase = createAdminClient()
  const pattern = `%${q}%`

  const [
    { data: members },
    { data: applications },
    { data: contacts },
  ] = await Promise.all([
    supabase.from('members')
      .select('id, name, email, membership_status, tier, car_make, car_model')
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(5),
    supabase.from('applications')
      .select('id, name, email, car_model, stripe_payment_status, source')
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(5),
    supabase.from('contacts')
      .select('id, application_id, applications(name, email, car_model)')
      .limit(5),
  ])

  // Filter contacts client-side since they join applications
  const matchedContacts = (contacts || []).filter(c => {
    const name = c.applications?.name || ''
    const email = c.applications?.email || ''
    return name.toLowerCase().includes(q.toLowerCase()) || email.toLowerCase().includes(q.toLowerCase())
  }).slice(0, 5)

  return Response.json({
    members: members || [],
    applications: applications || [],
    contacts: matchedContacts,
  })
}
