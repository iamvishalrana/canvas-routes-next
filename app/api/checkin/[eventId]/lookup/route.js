import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit } from '../../../../../lib/rateLimit'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'
import { findEventRegistrant } from '../../../../../lib/eventCheckinShared'

// Email-only lookup, no code/link sent — same low-stakes tradeoff as the
// WTET check-in lookup this is modeled on.
export async function POST(request, { params }) {
  const { eventId } = await params
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim() || 'unknown'
  if (await checkRateLimit(ip, 15, 60)) return Response.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const email = normalizeEmail(body?.email)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: event, error: eventErr } = await admin.from('events')
    .select('id, name, checkin_enabled, checkin_sections, checkin_max_passengers, checkin_lunch_options, checkin_waiver_text, checkin_lunch_cutoff')
    .eq('id', eventId).maybeSingle()
  if (eventErr || !event || !event.checkin_enabled) {
    return Response.json({ error: 'Check-in is not available for this event.' }, { status: 404 })
  }

  const registrant = await findEventRegistrant(admin, eventId, event.name, email)
  if (!registrant) {
    return Response.json({ error: `We couldn't find a registration for ${event.name} matching that email.` }, { status: 404 })
  }

  const { data: checkin } = await admin.from('event_checkins')
    .select('trip_details, waiver, lunch')
    .eq('event_id', eventId).eq('email', email).maybeSingle()

  const lunchCutoff = event.checkin_lunch_cutoff
  const lunchLocked = lunchCutoff ? new Date() > new Date(lunchCutoff) : false

  return Response.json({
    name: registrant.name,
    email,
    eventName: event.name,
    sections: event.checkin_sections || [],
    maxPassengers: event.checkin_max_passengers || 2,
    lunchOptions: event.checkin_lunch_options || [],
    waiverText: event.checkin_waiver_text || '',
    lunchCutoff,
    lunchLocked,
    tripDetails: checkin?.trip_details || null,
    waiver: checkin?.waiver || null,
    lunch: checkin?.lunch || null,
  })
}
