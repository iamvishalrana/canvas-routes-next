import { after } from 'next/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { checkRateLimit } from '../../../../lib/rateLimit'
import { captureException } from '../../../../lib/sentry'
import { isWtetEventName } from '../../../../lib/wtetRegistrationContent'
import { normalizeEventName } from '../../../../lib/eventMeta'
import { notifyIfWtetComplete } from '../../../../lib/wtetCompleteNotify'
import { normalizeEmail } from '../../../../lib/normalizeEmail'

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim() || 'unknown'
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }

  const {
    email, token, fullName, agreed, lang,
    vehicleYear, vehicleMake, vehicleModel,
    passengers, emergencyContactName, emergencyContactPhone,
  } = body || {}
  const waiverLang = lang === 'fr' ? 'fr' : 'en'

  const normalEmail = normalizeEmail(email)
  if (!token && (!normalEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalEmail))) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (agreed !== true) return Response.json({ error: 'You must agree to the waiver terms.' }, { status: 400 })
  if (!fullName?.trim() || fullName.trim().length < 2) return Response.json({ error: 'Please type your full legal name as signature.' }, { status: 400 })
  if (fullName.trim().length > 150) return Response.json({ error: 'Name too long.' }, { status: 400 })
  if (!emergencyContactName?.trim()) return Response.json({ error: 'Emergency contact name is required.' }, { status: 400 })
  if (!emergencyContactPhone?.trim() || emergencyContactPhone.replace(/\D/g, '').length < 7) {
    return Response.json({ error: 'A valid emergency contact phone number is required.' }, { status: 400 })
  }

  const cleanPassengers = Array.isArray(passengers)
    ? passengers
        .filter(p => p?.name?.trim())
        .map(p => ({ name: p.name.trim().slice(0, 100), age: p.age?.toString().trim().slice(0, 3) || null }))
    : []
  // Signer + this list is the whole car — cap at 1 extra passenger so total
  // occupants can't exceed 2, matching the Trip Details/Lunch cap.
  if (cleanPassengers.length > 1) {
    return Response.json({ error: 'Maximum 2 people per car. Email jerry@canvasroutes.com if you need to bring more than 2.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Token (from the emailed check-in link) takes priority when present —
  // both identifiers resolve to the same applications row.
  let appQuery = admin.from('applications').select('id, wtet_waiver, stripe_payment_type, stripe_payment_status, registrations')
  appQuery = token ? appQuery.eq('stripe_payment_intent_id', token) : appQuery.eq('email', normalEmail)
  const { data: app, error: lookupErr } = await appQuery.maybeSingle()

  if (lookupErr) {
    captureException(lookupErr, { context: 'wtet-waiver-lookup', email: normalEmail, hasToken: !!token })
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
  // Real Stripe registrations are gated on payment status; admin-manually-added
  // registrants (cash/e-transfer/comped) have no Stripe hold, so they're valid
  // as long as an admin added them as a registrant for this event.
  const isStripeWtet = app?.stripe_payment_type === 'road_trip_wtet' && ['paid', 'authorized'].includes(app?.stripe_payment_status)
  const isManualWtet = (app?.registrations || []).some(r => r.source === 'admin_manual' && isWtetEventName(normalizeEventName(r.event)))
  if (!app || (!isStripeWtet && !isManualWtet)) return Response.json({ error: 'No matching registration found.' }, { status: 404 })

  // Legal document — immutable once signed. Reject a second submission
  // instead of silently overwriting a prior signature.
  if (app.wtet_waiver) return Response.json({ error: 'This waiver has already been signed and cannot be edited.' }, { status: 400 })

  const waiverRecord = {
    full_name: fullName.trim(),
    lang: waiverLang,
    agreed: true,
    vehicle: {
      year: vehicleYear?.trim() || null,
      make: vehicleMake?.trim() || null,
      model: vehicleModel?.trim() || null,
    },
    passengers: cleanPassengers,
    emergency_contact: {
      name: emergencyContactName.trim(),
      phone: emergencyContactPhone.trim(),
    },
    signed_at: new Date().toISOString(),
    ip_address: ip,
  }

  // Atomic guard against a race: only write if still unsigned
  const { data: updated, error: updateErr } = await admin.from('applications')
    .update({ wtet_waiver: waiverRecord })
    .eq('id', app.id)
    .is('wtet_waiver', null)
    .select('id')
  if (updateErr) {
    captureException(updateErr, { context: 'wtet-waiver-save', email: normalEmail, hasToken: !!token })
    return Response.json({ error: 'Failed to save. Please try again.' }, { status: 500 })
  }
  if (!updated?.length) return Response.json({ error: 'This waiver has already been signed and cannot be edited.' }, { status: 400 })

  // Waiver can only be signed once (guarded above), so this can only ever
  // fire the consolidated notify a single time for this application.
  after(() => notifyIfWtetComplete(admin, app.id).catch(err => captureException(err, { context: 'wtet-waiver-complete-notify' })))

  return Response.json({ success: true, waiver: waiverRecord })
}
