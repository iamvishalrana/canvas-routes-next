import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../lib/supabase/admin'

export async function GET(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return Response.json({ members: [], applications: [], contacts: [] })

  const supabase = createAdminClient()
  const pattern = `%${q}%`

  // Members: text columns + JSONB cars cast to text for license plate search
  const memberOr = [
    'name', 'email', 'phone', 'instagram',
    'car_make', 'car_model', 'car_year',
  ].map(f => `${f}.ilike.${pattern}`).join(',')

  // Applications: text columns including notes and free-text fields
  const appOr = [
    'name', 'email', 'phone', 'instagram',
    'car_make', 'car_model', 'car_year',
    'notes', 'more',
  ].map(f => `${f}.ilike.${pattern}`).join(',')

  const [
    { data: memberRows },
    { data: memberCarsRows },
    { data: appRows },
    { data: contactAppRows },
  ] = await Promise.all([
    // Members: standard text columns
    supabase.from('members')
      .select('id, name, email, phone, instagram, membership_status, tier, car_make, car_model, cars')
      .or(memberOr)
      .limit(5),
    // Members: license plate search via cars JSONB cast
    supabase.from('members')
      .select('id, name, email, phone, instagram, membership_status, tier, car_make, car_model, cars')
      .filter('cars::text', 'ilike', pattern)
      .limit(5),
    // Applications: all text fields
    supabase.from('applications')
      .select('id, name, email, phone, instagram, car_model, stripe_payment_status')
      .or(appOr)
      .limit(5),
    // Contacts: search via linked application fields
    supabase.from('applications')
      .select('id, name, email, phone, instagram, car_model, contacts(id)')
      .or(appOr)
      .limit(10),
  ])

  // Merge members, deduplicate by id (license plate search may overlap text search)
  const memberMap = new Map()
  for (const m of [...(memberRows || []), ...(memberCarsRows || [])]) {
    if (!memberMap.has(m.id)) memberMap.set(m.id, m)
  }
  const members = [...memberMap.values()].slice(0, 5)

  // Only keep applications that have a linked contact row
  const contacts = (contactAppRows || [])
    .filter(a => a.contacts?.length > 0)
    .slice(0, 5)
    .map(a => ({
      id: a.contacts[0].id,
      application_id: a.id,
      applications: { name: a.name, email: a.email, car_model: a.car_model },
    }))

  return Response.json({
    members,
    applications: appRows || [],
    contacts,
  })
}
