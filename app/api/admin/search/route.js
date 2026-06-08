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
    { data: contactApps },
  ] = await Promise.all([
    supabase.from('members')
      .select('id, name, email, membership_status, tier, car_make, car_model')
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(5),
    supabase.from('applications')
      .select('id, name, email, car_model, stripe_payment_status')
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(5),
    // Search contacts via their linked application
    supabase.from('applications')
      .select('id, name, email, car_model, contacts(id)')
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(10),
  ])

  // Only keep applications that have a linked contact row
  const contacts = (contactApps || [])
    .filter(a => a.contacts?.length > 0)
    .slice(0, 5)
    .map(a => ({
      id: a.contacts[0].id,
      application_id: a.id,
      applications: { name: a.name, email: a.email, car_model: a.car_model },
    }))

  return Response.json({
    members: members || [],
    applications: applications || [],
    contacts,
  })
}
