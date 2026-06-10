import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const [{ data: events }, { data: registrations }, { data: member }] = await Promise.all([
    admin.from('events').select('*').order('date', { ascending: true }).limit(50),
    admin.from('event_registrations')
      .select('event_id, stripe_payment_status')
      .eq('member_id', user.id),
    admin.from('members').select('tier').eq('id', user.id).maybeSingle(),
  ])

  const registrationMap = {}
  for (const r of (registrations || [])) {
    registrationMap[r.event_id] = r.stripe_payment_status
  }

  const tier = member?.tier || 'routes_member'
  const now = new Date()

  return Response.json((events || []).map(ev => ({
    ...ev,
    userRegistrationStatus: registrationMap[ev.id] || null,
    memberTier: tier,
    isInPriorityWindow: ev.priority_window_end ? now < new Date(ev.priority_window_end) : false,
  })))
}
