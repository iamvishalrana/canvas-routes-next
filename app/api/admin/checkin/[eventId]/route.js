import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { listEventRegistrants } from '../../../../../lib/eventCheckinShared'

export async function GET(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { eventId } = await params

  const admin = createAdminClient()
  const { data: event, error: eventErr } = await admin.from('events')
    .select('id, name, checkin_enabled, checkin_sections, checkin_max_passengers, checkin_lunch_options, checkin_waiver_text, checkin_waiver_text_fr, checkin_lunch_cutoff')
    .eq('id', eventId).maybeSingle()
  if (eventErr || !event) return Response.json({ error: 'Event not found' }, { status: 404 })

  const [registrants, { data: checkins }] = await Promise.all([
    listEventRegistrants(admin, eventId, event.name),
    admin.from('event_checkins').select('*').eq('event_id', eventId),
  ])

  const checkinByEmail = new Map((checkins || []).map(c => [(c.email || '').toLowerCase(), c]))
  const participants = registrants.map(r => {
    const c = checkinByEmail.get(r.email)
    return {
      name: r.name,
      email: r.email,
      trip_details: c?.trip_details || null,
      waiver: c?.waiver || null,
      lunch: c?.lunch || null,
    }
  })

  return Response.json({ event, participants })
}
