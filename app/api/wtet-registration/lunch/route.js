import { createAdminClient } from '../../../../lib/supabase/admin'
import { checkRateLimit } from '../../../../lib/rateLimit'
import { captureException } from '../../../../lib/sentry'
import { WTET_EVENT_NAME, WTET_LUNCH_OPTIONS, WTET_LUNCH_DEFAULT_CUTOFF } from '../../../../lib/wtetRegistrationContent'
import { normalizeEventName } from '../../../../lib/eventMeta'

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim() || 'unknown'
  if (await checkRateLimit(ip, 15, 60)) return Response.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const email = (body?.email || '').toLowerCase().trim()
  const token = body?.token
  const dishIds = body?.dishIds
  if (!token && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (!Array.isArray(dishIds) || dishIds.length === 0) {
    return Response.json({ error: 'Please select a dish for everyone in the car.' }, { status: 400 })
  }
  if (dishIds.some(id => !WTET_LUNCH_OPTIONS.find(d => d.id === id))) {
    return Response.json({ error: 'Please select a valid dish.' }, { status: 400 })
  }

  const admin = createAdminClient()

  let appQuery = admin.from('applications').select('id, wtet_checkin, stripe_payment_type, stripe_payment_status, registrations')
  appQuery = token ? appQuery.eq('stripe_payment_intent_id', token) : appQuery.eq('email', email)

  const [{ data: app, error: lookupErr }, { data: cutoffSetting }] = await Promise.all([
    appQuery.maybeSingle(),
    admin.from('settings').select('value').eq('key', 'wtet_lunch_cutoff').maybeSingle(),
  ])
  if (lookupErr) {
    captureException(lookupErr, { context: 'wtet-lunch-lookup', email, hasToken: !!token })
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
  // Real Stripe registrations are gated on payment status; admin-manually-added
  // registrants (cash/e-transfer/comped) have no Stripe hold, so they're valid
  // as long as an admin added them as a registrant for this event.
  const isStripeWtet = app?.stripe_payment_type === 'road_trip_wtet' && ['paid', 'authorized'].includes(app?.stripe_payment_status)
  const isManualWtet = (app?.registrations || []).some(r => r.source === 'admin_manual' && normalizeEventName(r.event) === WTET_EVENT_NAME)
  if (!app || (!isStripeWtet && !isManualWtet)) return Response.json({ error: 'No matching registration found.' }, { status: 404 })

  const passengersList = app.wtet_checkin?.passengers_list
  if (!Array.isArray(passengersList) || passengersList.length === 0) {
    return Response.json({ error: 'Please complete your trip details first so we know who\'s ordering lunch.' }, { status: 400 })
  }
  if (dishIds.length !== passengersList.length) {
    return Response.json({ error: 'Please select a dish for everyone in the car.' }, { status: 400 })
  }

  const cutoff = cutoffSetting?.value || WTET_LUNCH_DEFAULT_CUTOFF
  if (new Date() > new Date(cutoff)) {
    return Response.json({ error: 'The deadline to select or change your lunch choice has passed. Contact jerry@canvasroutes.com if you need to make a change.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const lunchRecord = passengersList.map((p, i) => {
    const dish = WTET_LUNCH_OPTIONS.find(d => d.id === dishIds[i])
    return { name: p.name, dish_id: dish.id, dish_name: dish.name, selected_at: now }
  })

  const { error: updateErr } = await admin.from('applications')
    .update({ wtet_lunch: lunchRecord })
    .eq('id', app.id)
  if (updateErr) {
    captureException(updateErr, { context: 'wtet-lunch-save', email, hasToken: !!token })
    return Response.json({ error: 'Failed to save. Please try again.' }, { status: 500 })
  }

  return Response.json({ success: true, lunch: lunchRecord })
}
