import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { captureException } from '../../../../../lib/sentry'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'
import { findEventRegistrant } from '../../../../../lib/eventCheckinShared'
import { maybeSendCheckinCompleteEmail } from '../../../../../lib/maybeSendCheckinCompleteEmail.js'

export async function POST(request, { params }) {
  const { eventId } = await params
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const {
    fullName, agreed, vehicleYear, vehicleMake, vehicleModel,
    passengers, emergencyContactName, emergencyContactPhone,
  } = body || {}
  const email = normalizeEmail(body?.email)

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (agreed !== true) return Response.json({ error: 'You must agree to the waiver terms.' }, { status: 400 })
  if (!fullName?.trim() || fullName.trim().length < 2) return Response.json({ error: 'Please type your full legal name as signature.' }, { status: 400 })
  if (fullName.trim().length > 150) return Response.json({ error: 'Name too long.' }, { status: 400 })
  if (!emergencyContactName?.trim()) return Response.json({ error: 'Emergency contact name is required.' }, { status: 400 })
  if (!emergencyContactPhone?.trim() || emergencyContactPhone.replace(/\D/g, '').length < 7) {
    return Response.json({ error: 'A valid emergency contact phone number is required.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: event } = await admin.from('events')
    .select('id, name, checkin_enabled, checkin_max_passengers, checkin_waiver_text, checkin_waiver_text_fr')
    .eq('id', eventId).maybeSingle()
  if (!event || !event.checkin_enabled) return Response.json({ error: 'Check-in is not available for this event.' }, { status: 404 })

  const maxPassengers = event.checkin_max_passengers || 2
  const rawPassengers = Array.isArray(passengers) ? passengers.filter(p => p?.name?.trim()) : []
  if (rawPassengers.length > maxPassengers - 1) {
    return Response.json({ error: `Maximum ${maxPassengers} people per car.` }, { status: 400 })
  }
  for (const p of rawPassengers) {
    const ageNum = parseInt(p.age)
    if (!p.age?.toString().trim() || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return Response.json({ error: 'Please provide a valid age (1–120) for each passenger.' }, { status: 400 })
    }
  }
  const cleanPassengers = rawPassengers.map(p => ({ name: p.name.trim().slice(0, 100), age: p.age.toString().trim().slice(0, 3) }))

  const registrant = await findEventRegistrant(admin, eventId, event.name, email)
  if (!registrant) return Response.json({ error: 'No matching registration found.' }, { status: 404 })

  const { data: existing } = await admin.from('event_checkins')
    .select('waiver').eq('event_id', eventId).eq('email', email).maybeSingle()
  if (existing?.waiver) return Response.json({ error: 'This waiver has already been signed and cannot be edited.' }, { status: 400 })

  const waiverRecord = {
    full_name: fullName.trim(),
    agreed: true,
    waiver_text_snapshot: event.checkin_waiver_text || null,
    waiver_text_snapshot_fr: event.checkin_waiver_text_fr || null,
    vehicle: { year: vehicleYear?.trim() || null, make: vehicleMake?.trim() || null, model: vehicleModel?.trim() || null },
    passengers: cleanPassengers,
    emergency_contact: { name: emergencyContactName.trim(), phone: emergencyContactPhone.trim() },
    signed_at: new Date().toISOString(),
    ip_address: ip,
  }

  const { error: upsertErr } = await admin.from('event_checkins').upsert(
    { event_id: eventId, email, name: registrant.name, waiver: waiverRecord, updated_at: new Date().toISOString() },
    { onConflict: 'event_id,email' }
  )
  if (upsertErr) {
    captureException(upsertErr, { context: 'generic-checkin-waiver-save', email, eventId })
    return Response.json({ error: 'Failed to save. Please try again.' }, { status: 500 })
  }

  await maybeSendCheckinCompleteEmail(admin, eventId, email, event.name).catch(err => captureException(err, { context: 'checkin-complete-trigger-waiver', email, eventId }))

  return Response.json({ success: true, waiver: waiverRecord })
}
