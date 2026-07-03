import { createAdminClient } from '../../../../lib/supabase/admin'
import { checkRateLimit } from '../../../../lib/rateLimit'
import { captureException } from '../../../../lib/sentry'
import { WTET_EVENT_NAME, WTET_LUNCH_OPTIONS, WTET_LUNCH_DEFAULT_CUTOFF } from '../../../../lib/wtetRegistrationContent'
import { normalizeEventName } from '../../../../lib/eventMeta'

// Email-only lookup, no code/link sent. Rate-limited per IP to slow down
// enumeration — accepted tradeoff for a low-stakes single-event lookup.
export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim() || 'unknown'
  if (await checkRateLimit(ip, 15, 60)) return Response.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const email = (body?.email || '').toLowerCase().trim()
  const token = body?.token
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const admin = createAdminClient()
  let appQuery = admin.from('applications')
    .select('id, name, email, passengers, car_year, car_make, car_model, stripe_payment_status, stripe_payment_type, registrations, wtet_checkin, wtet_waiver, wtet_lunch')
    .eq('email', email)
  // If a token was carried from the emailed check-in link, require it to match
  // too — the typed email must belong to that exact registration, not just any
  // WTET registration sharing the same address.
  if (token) appQuery = appQuery.eq('stripe_payment_intent_id', token)

  const [{ data: app, error: appErr }, { data: cutoffSetting }] = await Promise.all([
    appQuery.maybeSingle(),
    admin.from('settings').select('value').eq('key', 'wtet_lunch_cutoff').maybeSingle(),
  ])

  if (appErr) {
    captureException(appErr, { context: 'wtet-registration-lookup', email })
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }

  // Real Stripe registrations are gated on payment status; admin-manually-added
  // registrants (cash/e-transfer/comped at the door) have no Stripe hold, so they're
  // valid as long as an admin added them as a registrant for this event.
  const isStripeWtet = app?.stripe_payment_type === 'road_trip_wtet' && ['paid', 'authorized'].includes(app?.stripe_payment_status)
  const isManualWtet = (app?.registrations || []).some(r => r.source === 'admin_manual' && normalizeEventName(r.event) === WTET_EVENT_NAME)

  if (!app || (!isStripeWtet && !isManualWtet)) {
    return Response.json({ error: token
      ? "That email doesn't match this check-in link. Please use the email you registered with."
      : "We couldn't find a Whips to Eastern Townships registration matching that email." }, { status: 404 })
  }

  const cutoff = cutoffSetting?.value || WTET_LUNCH_DEFAULT_CUTOFF
  const lunchLocked = new Date() > new Date(cutoff)

  return Response.json({
    name: app.name || '',
    email: app.email,
    passengers: app.passengers || '1',
    alreadyCompleted: !!app.wtet_checkin,
    carYear: app.car_year || '',
    carMake: app.car_make || '',
    carModel: app.car_model || '',
    eventName: WTET_EVENT_NAME,
    waiver: app.wtet_waiver || null,
    lunch: app.wtet_lunch || null,
    lunchOptions: WTET_LUNCH_OPTIONS,
    lunchCutoff: cutoff,
    lunchLocked,
  })
}
