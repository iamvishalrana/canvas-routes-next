import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit } from '../../../../../lib/rateLimit'
import { captureException } from '../../../../../lib/sentry'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'
import { findEventRegistrant } from '../../../../../lib/eventCheckinShared'

export async function POST(request, { params }) {
  const { eventId } = await params
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim() || 'unknown'
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const email = normalizeEmail(body?.email)
  const { dietary, whatsapp, passengers_list } = body || {}
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: event } = await admin.from('events')
    .select('id, name, checkin_enabled, checkin_max_passengers')
    .eq('id', eventId).maybeSingle()
  if (!event || !event.checkin_enabled) return Response.json({ error: 'Check-in is not available for this event.' }, { status: 404 })

  const maxPassengers = event.checkin_max_passengers || 2
  if (!Array.isArray(passengers_list) || passengers_list.length === 0) {
    return Response.json({ error: 'At least one passenger (the driver) is required.' }, { status: 400 })
  }
  if (passengers_list.length > maxPassengers) {
    return Response.json({ error: `Maximum ${maxPassengers} people per car.` }, { status: 400 })
  }
  for (const p of passengers_list) {
    if (!p.name?.trim()) return Response.json({ error: 'Please provide a name for each passenger.' }, { status: 400 })
    const ageNum = parseInt(p.age)
    if (!p.age?.toString().trim() || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return Response.json({ error: 'Please provide a valid age (1–120) for each passenger.' }, { status: 400 })
    }
  }

  const registrant = await findEventRegistrant(admin, eventId, event.name, email)
  if (!registrant) return Response.json({ error: 'No matching registration found.' }, { status: 404 })

  const { data: existing } = await admin.from('event_checkins')
    .select('trip_details').eq('event_id', eventId).eq('email', email).maybeSingle()
  if (existing?.trip_details) return Response.json({ error: 'Already completed.' }, { status: 400 })

  const cleanedPassengers = passengers_list.map(p => ({ name: p.name.trim(), age: p.age.toString().trim() }))
  const tripDetails = {
    dietary: dietary || null,
    whatsapp: whatsapp || null,
    passengers_list: cleanedPassengers,
    completed_at: new Date().toISOString(),
  }

  const { error: upsertErr } = await admin.from('event_checkins').upsert(
    { event_id: eventId, email, name: registrant.name, trip_details: tripDetails, updated_at: new Date().toISOString() },
    { onConflict: 'event_id,email' }
  )
  if (upsertErr) {
    captureException(upsertErr, { context: 'generic-checkin-trip-details-save', email, eventId })
    return Response.json({ error: 'Failed to save' }, { status: 500 })
  }

  return Response.json({ success: true })
}
