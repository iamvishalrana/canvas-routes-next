import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit } from '../../../../../lib/rateLimit'
import { captureException } from '../../../../../lib/sentry'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'
import { findEventRegistrant } from '../../../../../lib/eventCheckinShared'

export async function POST(request, { params }) {
  const { eventId } = await params
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim() || 'unknown'
  if (await checkRateLimit(ip, 15, 60)) return Response.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const email = normalizeEmail(body?.email)
  const dishIds = body?.dishIds
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (!Array.isArray(dishIds) || dishIds.length === 0) {
    return Response.json({ error: 'Please select a dish for everyone in the car.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: event } = await admin.from('events')
    .select('id, name, checkin_enabled, checkin_lunch_options, checkin_lunch_cutoff')
    .eq('id', eventId).maybeSingle()
  if (!event || !event.checkin_enabled) return Response.json({ error: 'Check-in is not available for this event.' }, { status: 404 })

  const lunchOptions = event.checkin_lunch_options || []
  if (dishIds.some(id => !lunchOptions.find(d => d.id === id))) {
    return Response.json({ error: 'Please select a valid dish.' }, { status: 400 })
  }

  const registrant = await findEventRegistrant(admin, eventId, event.name, email)
  if (!registrant) return Response.json({ error: 'No matching registration found.' }, { status: 404 })

  const { data: existing } = await admin.from('event_checkins')
    .select('trip_details').eq('event_id', eventId).eq('email', email).maybeSingle()
  const passengersList = existing?.trip_details?.passengers_list
  if (!Array.isArray(passengersList) || passengersList.length === 0) {
    return Response.json({ error: "Please complete your trip details first so we know who's ordering lunch." }, { status: 400 })
  }
  if (dishIds.length !== passengersList.length) {
    return Response.json({ error: 'Please select a dish for everyone in the car.' }, { status: 400 })
  }

  if (event.checkin_lunch_cutoff && new Date() > new Date(event.checkin_lunch_cutoff)) {
    return Response.json({ error: 'The deadline to select or change your lunch choice has passed.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const lunchRecord = passengersList.map((p, i) => {
    const dish = lunchOptions.find(d => d.id === dishIds[i])
    return { name: p.name, dish_id: dish.id, dish_name: dish.name, selected_at: now }
  })

  const { error: upsertErr } = await admin.from('event_checkins').upsert(
    { event_id: eventId, email, name: registrant.name, lunch: lunchRecord, updated_at: now },
    { onConflict: 'event_id,email' }
  )
  if (upsertErr) {
    captureException(upsertErr, { context: 'generic-checkin-lunch-save', email, eventId })
    return Response.json({ error: 'Failed to save. Please try again.' }, { status: 500 })
  }

  return Response.json({ success: true, lunch: lunchRecord })
}
