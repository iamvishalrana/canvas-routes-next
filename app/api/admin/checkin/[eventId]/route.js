import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { listEventRegistrants } from '../../../../../lib/eventCheckinShared'

export async function GET(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { eventId } = await params

  const admin = createAdminClient()
  const { data: event, error: eventErr } = await admin.from('events')
    .select('id, name, checkin_enabled, checkin_sections, checkin_max_passengers, checkin_lunch_options, checkin_lunch_intro, checkin_waiver_text, checkin_waiver_text_fr, checkin_lunch_cutoff')
    .eq('id', eventId).maybeSingle()
  if (eventErr || !event) return Response.json({ error: 'Event not found' }, { status: 404 })

  const [registrants, { data: checkins }] = await Promise.all([
    listEventRegistrants(admin, eventId, event.name),
    admin.from('event_checkins').select('*').eq('event_id', eventId),
  ])

  const emails = registrants.map(r => r.email)
  // Fallback photo source for members who haven't submitted an event-specific
  // one — same resolution listEventCandidates uses for the public roster, so
  // this view doesn't show "Not sent yet." for someone whose car photo is
  // already showing on the itinerary page via their member profile.
  const { data: members } = emails.length
    ? await admin.from('members').select('email, cars, car_photo_url').in('email', emails)
    : { data: [] }
  const memberByEmail = new Map((members || []).map(m => [(m.email || '').toLowerCase(), m]))

  const checkinByEmail = new Map((checkins || []).map(c => [(c.email || '').toLowerCase(), c]))
  const participants = registrants.map(r => {
    const c = checkinByEmail.get(r.email)
    const m = memberByEmail.get(r.email)
    return {
      name: r.name,
      email: r.email,
      trip_details: c?.trip_details || null,
      waiver: c?.waiver || null,
      lunch: c?.lunch || null,
      car_photo: c?.car_photo || null,
      profile_photo_url: m?.cars?.[0]?.photo_url || m?.car_photo_url || null,
      paymentStatus: r.paymentStatus,
      applicationId: r.applicationId,
      convoy_group: r.convoy_group ?? null,
      amountPaid: r.amountPaid,
      registration: r.registration || null,
      isMember: !!r.isMember,
      discount: r.discount || null,
    }
  })

  return Response.json({ event, participants })
}
