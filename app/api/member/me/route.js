import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { attendanceKeyToEventName, normalizeEventName } from '../../../../lib/eventMeta.js'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = createAdminClient()
    const normalEmail = user.email?.toLowerCase().trim()

    const [{ data: member }, { data: application }, { data: eventRegs }] = await Promise.all([
      admin.from('members').select('id, name, email, phone, instagram, instagram_opted_out, car_year, car_make, car_model, cars, dob_month, dob_day, dob_year, membership_status, tier, join_date, created_at, membership_number, car_photo_url, profile_photo_url, password_set_at, event_attendance').eq('id', user.id).maybeSingle(),
      normalEmail
        ? admin.from('applications').select('registrations, stripe_payment_status, stripe_payment_type').eq('email', normalEmail).maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from('event_registrations').select('event_id, stripe_payment_status').eq('member_id', user.id),
    ])

    // Season stats — attended events are the union of application registration
    // history and members.event_attendance (same logic as the dashboard)
    const attendedNames = new Set(
      (application?.registrations || [])
        .filter(r => r.attended === true && r.event)
        .map(r => normalizeEventName(r.event))
    )
    for (const [key, v] of Object.entries(member?.event_attendance || {})) {
      if (v === true) attendedNames.add(attendanceKeyToEventName(key))
    }

    const portalRegistered = (eventRegs || []).filter(r => ['free', 'paid'].includes(r.stripe_payment_status)).length
    const roadTripRegistered = (['paid', 'authorized'].includes(application?.stripe_payment_status)
      && application?.stripe_payment_type?.startsWith('road_trip_')) ? 1 : 0

    const stats = {
      attended: attendedNames.size,
      registered: portalRegistered + roadTripRegistered,
      memberSince: member?.created_at || member?.join_date || null,
    }

    // event_attendance is internal — don't ship the raw map to the client
    if (member) delete member.event_attendance

    return Response.json({ user: { id: user.id, email: user.email }, member: member || null, stats })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
