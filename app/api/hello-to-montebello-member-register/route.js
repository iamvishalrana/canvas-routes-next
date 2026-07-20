import { createClient } from '../../../lib/supabase/server'
import { deviceType } from '../../../lib/deviceType'
import { createAdminClient } from '../../../lib/supabase/admin'
import { stripe } from '../../../lib/stripe.js'
import { checkRateLimit, getClientIp } from '../../../lib/rateLimit.js'
import { captureException } from '../../../lib/sentry.js'
import { computeTax } from '../../../lib/tax.js'

// Route/itinerary names say "Name — Year" only, never the exact date (site convention).
const EVENT_NAME = 'Hello to Montebello — 2026'
// Prior canonical names (exact-date, then a first year-only pass) — matched
// against too so anyone who registered before either rename is still
// recognized (and their entry gets replaced, not duplicated) instead of
// silently creating a second registrations[] row.
const OLD_EVENT_NAMES = ['Hello to Montebello — July 26, 2026', 'Hello to Montebello — August 1, 2026']
const MEMBER_PRICE_CENTS = 19900 // $199 CAD

export async function GET() {
  // Returns member's existing Hello to Montebello registration status
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: reg } = await admin
      .from('applications')
      .select('stripe_payment_status, registrations')
      .eq('email', user.email.toLowerCase())
      .maybeSingle()

    const htmReg = (reg?.registrations || []).find(r => r.event === EVENT_NAME || OLD_EVENT_NAMES.includes(r.event))
    const status = reg?.stripe_payment_status || null
    const alreadyRegistered = htmReg && ['authorized', 'paid'].includes(status)

    return Response.json({ alreadyRegistered: !!alreadyRegistered, status })
  } catch (e) {
    captureException(e, { context: 'htm-member-register-get' })
    return Response.json({ alreadyRegistered: false, status: null })
  }
}

export async function POST(request) {
  if (!stripe) return Response.json({ error: 'Payments not configured.' }, { status: 503 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Check registration open — members respect the same gate as the public form
  try {
    const adminCheck = createAdminClient()
    const { data: ev } = await adminCheck.from('events').select('registration_enabled').ilike('name', `${EVENT_NAME.split(' — ')[0]}%`).maybeSingle()
    if (ev && ev.registration_enabled === false) {
      return Response.json({ error: 'Registration is currently closed.' }, { status: 403 })
    }
  } catch { /* allow through if events table unavailable */ }

  const ip = getClientIp(request)
  if (ip && await checkRateLimit(ip, 10, 60)) {
    return Response.json({ error: 'Too many requests.' }, { status: 429 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { carYear, carMake, carModel, passengers, hasChildren, childrenAges, more, _health_check } = body
  const normalEmail = user.email.toLowerCase().trim()

  // Duplicate guard — one per member
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('applications')
    .select('id, stripe_payment_status, registrations, stripe_payment_intent_id')
    .eq('email', normalEmail)
    .maybeSingle()

  const existingHtm = (existing?.registrations || []).find(r => r.event === EVENT_NAME || OLD_EVENT_NAMES.includes(r.event))
  if (existingHtm && ['authorized', 'paid'].includes(existing?.stripe_payment_status)) {
    return Response.json({ error: 'You have already registered for this event.' }, { status: 400 })
  }

  // Validate
  if (!carYear?.trim()) return Response.json({ error: 'Car year is required.' }, { status: 400 })
  if (!carMake?.trim()) return Response.json({ error: 'Car make is required.' }, { status: 400 })
  if (!carModel?.trim()) return Response.json({ error: 'Car model is required.' }, { status: 400 })
  const VALID_PASSENGERS = ['1', '2', '3', '4+']
  if (!passengers || !VALID_PASSENGERS.includes(passengers)) return Response.json({ error: 'Number of passengers is required.' }, { status: 400 })
  if (!hasChildren || !['yes', 'no'].includes(hasChildren)) return Response.json({ error: 'Please answer the children question.' }, { status: 400 })
  if (hasChildren === 'yes' && !childrenAges?.trim()) return Response.json({ error: 'Please provide the ages of children attending.' }, { status: 400 })

  // Get member name for emails
  const { data: member } = await admin.from('members').select('name').eq('id', user.id).maybeSingle()
  const memberName = member?.name?.trim() || normalEmail.split('@')[0]
  const fullCar = [carMake.trim(), carModel.trim()].filter(Boolean).join(' ')

  // Save to DB as pending
  try {
    const existingReg = (existing?.registrations || []).find(r => r.event === EVENT_NAME || OLD_EVENT_NAMES.includes(r.event))
    const newReg = {
      event: EVENT_NAME,
      registered_at: existingReg?.registered_at || new Date().toISOString(),
      attended: existingReg?.attended ?? null,
    }
    const prevRegs = (existing?.registrations || []).filter(r => r.event !== EVENT_NAME && !OLD_EVENT_NAMES.includes(r.event))
    const registrations = [...prevRegs, newReg]

    const { data: appData, error: upsertErr } = await admin.from('applications').upsert({
      device_type: deviceType(request),
      email: normalEmail,
      name: memberName,
      car_year: carYear.trim(),
      car_make: carMake.trim(),
      car_model: fullCar,
      passengers: passengers || null,
      has_children: hasChildren || null,
      children_ages: childrenAges || null,
      more: more || null,
      registrations,
      stripe_payment_status: 'pending',
      // New payment cycle — clear the previous flow's capture timestamp so the
      // confirm route's email claim and the webhook's already-captured check
      // (both keyed on stripe_paid_at) work for this registration
      stripe_paid_at: null,
      ...(existing ? { reregistered_at: new Date().toISOString() } : {}),
    }, { onConflict: 'email' }).select('id').single()

    if (upsertErr) captureException(upsertErr, { context: 'htm-member-register-db', email: normalEmail })
    else if (appData?.id) {
      const { error: contactErr } = await admin.from('contacts').upsert(
        { application_id: appData.id },
        { onConflict: 'application_id', ignoreDuplicates: true }
      )
      if (contactErr) captureException(contactErr, { context: 'htm-member-register-contacts' })
    }
  } catch (e) {
    captureException(e, { context: 'htm-member-register-db-outer', email: normalEmail })
  }

  // Create Stripe PI — immediate capture for members (vetted, no manual review needed)
  const { total: memberTotalWithTax } = computeTax(MEMBER_PRICE_CENTS)
  try {
    const pi = await stripe.paymentIntents.create({
      amount: memberTotalWithTax,
      currency: 'cad',
      receipt_email: normalEmail,
      metadata: {
        type: 'road_trip_hello-to-montebello',
        email: normalEmail,
        name: memberName,
        event_name: EVENT_NAME,
        is_member: 'yes',
        member_id: user.id,
        car_year: carYear.trim(),
        car_make: carMake.trim(),
        car_model: fullCar,
        passengers: passengers || '',
        has_children: hasChildren || '',
        children_ages: childrenAges || '',
        original_amount: String(MEMBER_PRICE_CENTS),
        ...(_health_check ? {
          source: 'health_check',
          health_check_note: '⚠️ AUTOMATED PLAYWRIGHT HEALTH CHECK — NOT A REAL PAYMENT — SAFE TO CANCEL',
        } : {}),
      },
      description: `Canvas Routes — ${EVENT_NAME} (Member rate)`,
      automatic_payment_methods: { enabled: true },
    })
    // Cancel the previous PI if re-registering — prevents ghost holds. The
    // applications row shares ONE stripe_payment_intent_id across membership and
    // every road trip, so verify the stored PI belongs to THIS flow before
    // cancelling — a blind cancel can release a live hold from another flow.
    if (existing?.stripe_payment_intent_id && existing.stripe_payment_intent_id !== pi.id) {
      stripe.paymentIntents.retrieve(existing.stripe_payment_intent_id).then(prev => {
        if (prev.metadata?.type === 'road_trip_hello-to-montebello' && prev.status !== 'succeeded') {
          return stripe.paymentIntents.cancel(existing.stripe_payment_intent_id)
        }
      }).catch(() => {})
    }

    // Store PI ID immediately so htm-member-confirm can find this row after payment
    const { error: piStoreErr } = await admin.from('applications')
      .update({ stripe_payment_intent_id: pi.id, stripe_payment_type: 'road_trip_hello-to-montebello' })
      .eq('email', normalEmail)
    if (piStoreErr) captureException(piStoreErr, { context: 'htm-member-register-pi-store', email: normalEmail })
    return Response.json({ clientSecret: pi.client_secret })
  } catch (err) {
    captureException(err, { context: 'htm-member-create-pi', email: normalEmail })
    return Response.json({ error: 'Failed to initialise payment. Please try again.' }, { status: 500 })
  }
}
