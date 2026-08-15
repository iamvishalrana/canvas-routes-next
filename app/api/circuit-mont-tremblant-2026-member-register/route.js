import { after } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { deviceType } from '../../../lib/deviceType'
import { createAdminClient } from '../../../lib/supabase/admin'
import { stripe } from '../../../lib/stripe.js'
import { checkRateLimit, getClientIp } from '../../../lib/rateLimit.js'
import { captureException, captureMessage } from '../../../lib/sentry.js'
import { computeTax } from '../../../lib/tax.js'
import { buildAdminNotifyHtml } from '../../../lib/adminEmail.js'

const EVENT_NAME = 'Circuit Mont-Tremblant — Track Day — September 13, 2026'
const MEMBER_PRICE_CENTS = 34900 // $349 CAD

export async function GET() {
  // Returns member's existing Circuit Mont-Tremblant registration status
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: reg } = await admin
      .from('applications')
      .select('registrations')
      .eq('email', user.email.toLowerCase())
      .maybeSingle()

    // Per-event paid flag, not the shared stripe_payment_status column — that
    // column is reused across every paid flow this member ever touches, so
    // it can read 'pending' from an unrelated flow even after this event was
    // paid in full. See lib/markRegistrationPaid.js.
    const reg_ = (reg?.registrations || []).find(r => r.event === EVENT_NAME)
    const alreadyRegistered = !!reg_?.paid

    return Response.json({ alreadyRegistered })
  } catch (e) {
    captureException(e, { context: 'cmt-member-register-get' })
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
    // Match on the FULL event name — see the identical comment in
    // circuit-mont-tremblant-2026-register/route.js for why a loose prefix match
    // (just 'The Circuit Mont-Tremblant') would risk colliding with next year's edition.
    const { data: ev } = await adminCheck.from('events').select('registration_enabled').ilike('name', `${EVENT_NAME}%`).maybeSingle()
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

  const { vehicleChoice, year, carMake, carModel, rentalCar, more, lang, _health_check } = body
  const normalEmail = user.email.toLowerCase().trim()

  // Duplicate guard — one per member
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('applications')
    .select('id, stripe_payment_status, registrations, stripe_payment_intent_id')
    .eq('email', normalEmail)
    .maybeSingle()

  // Per-event paid flag, not the shared stripe_payment_status column — see
  // lib/markRegistrationPaid.js for why that column can't be trusted here.
  const existingReg = (existing?.registrations || []).find(r => r.event === EVENT_NAME)
  if (existingReg?.paid) {
    return Response.json({ error: 'You have already registered for this event.' }, { status: 400 })
  }

  // Validate
  const VALID_VEHICLE = ['own', 'rental']
  if (!vehicleChoice || !VALID_VEHICLE.includes(vehicleChoice))
    return Response.json({ error: 'Please tell us which car you plan to drive.' }, { status: 400 })
  if (vehicleChoice === 'own') {
    if (!year?.trim()) return Response.json({ error: 'Car year is required.' }, { status: 400 })
    if (!carMake?.trim()) return Response.json({ error: 'Car make is required.' }, { status: 400 })
    if (!carModel?.trim()) return Response.json({ error: 'Car model is required.' }, { status: 400 })
  } else {
    const VALID_RENTAL = ['GR86', 'Mustang GT']
    if (!rentalCar || !VALID_RENTAL.includes(rentalCar))
      return Response.json({ error: 'Please select a rental car.' }, { status: 400 })
  }

  // Get member name for emails
  const { data: member } = await admin.from('members').select('name').eq('id', user.id).maybeSingle()
  const memberName = member?.name?.trim() || normalEmail.split('@')[0]
  const fullCar = vehicleChoice === 'own'
    ? [carMake.trim(), carModel.trim()].filter(Boolean).join(' ')
    : `Rental — Toyota ${rentalCar === 'GR86' ? 'GR86' : ''}${rentalCar === 'Mustang GT' ? 'Ford Mustang GT' : ''} (manual)`

  // Save to DB as pending
  try {
    const newReg = {
      event: EVENT_NAME,
      registered_at: existingReg?.registered_at || new Date().toISOString(),
      attended: existingReg?.attended ?? null,
      paid: existingReg?.paid ?? false,
    }
    const prevRegs = (existing?.registrations || []).filter(r => r.event !== EVENT_NAME)
    const registrations = [...prevRegs, newReg]

    const { data: appData, error: upsertErr } = await admin.from('applications').upsert({
      device_type: deviceType(request),
      email: normalEmail,
      name: memberName,
      car_year: vehicleChoice === 'own' ? year.trim() : null,
      car_make: vehicleChoice === 'own' ? carMake.trim() : null,
      car_model: fullCar,
      more: more || null,
      registrations,
      lang: lang === 'fr' ? 'fr' : 'en',
      stripe_payment_status: 'pending',
      // New payment cycle — clear the previous flow's capture timestamp so the
      // confirm route's email claim and the webhook's already-captured check
      // (both keyed on stripe_paid_at) work for this registration
      stripe_paid_at: null,
      ...(existing ? { reregistered_at: new Date().toISOString() } : {}),
    }, { onConflict: 'email' }).select('id').single()

    if (upsertErr) captureException(upsertErr, { context: 'cmt-member-register-db', email: normalEmail })
    else if (appData?.id) {
      const { error: contactErr } = await admin.from('contacts').upsert(
        { application_id: appData.id },
        { onConflict: 'application_id', ignoreDuplicates: true }
      )
      if (contactErr) captureException(contactErr, { context: 'cmt-member-register-contacts' })
    }
  } catch (e) {
    captureException(e, { context: 'cmt-member-register-db-outer', email: normalEmail })
  }

  // Create Stripe PI — immediate capture for members (vetted, no manual review needed)
  const { total: memberTotalWithTax } = computeTax(MEMBER_PRICE_CENTS)
  try {
    const pi = await stripe.paymentIntents.create({
      amount: memberTotalWithTax,
      currency: 'cad',
      receipt_email: normalEmail,
      metadata: {
        type: 'road_trip_circuit-mont-tremblant-2026',
        email: normalEmail,
        name: memberName,
        event_name: EVENT_NAME,
        is_member: 'yes',
        member_id: user.id,
        car_year: vehicleChoice === 'own' ? year.trim() : '',
        car_make: vehicleChoice === 'own' ? carMake.trim() : '',
        car_model: fullCar,
        vehicle_choice: vehicleChoice,
        rental_car: vehicleChoice === 'rental' ? rentalCar : '',
        original_amount: String(MEMBER_PRICE_CENTS),
        lang: lang === 'fr' ? 'fr' : 'en',
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
        if (prev.metadata?.type === 'road_trip_circuit-mont-tremblant-2026' && prev.status !== 'succeeded') {
          return stripe.paymentIntents.cancel(existing.stripe_payment_intent_id)
        }
      }).catch(() => {})
    }

    // Store PI ID immediately so circuit-mont-tremblant-2026-member-confirm can find this row after payment
    const { error: piStoreErr } = await admin.from('applications')
      .update({ stripe_payment_intent_id: pi.id, stripe_payment_type: 'road_trip_circuit-mont-tremblant-2026' })
      .eq('email', normalEmail)
    if (piStoreErr) captureException(piStoreErr, { context: 'cmt-member-register-pi-store', email: normalEmail })

    // Notify Jerry immediately when a member reaches the payment step — same
    // belt-and-suspenders heads-up the non-member route already sends
    // (circuit-mont-tremblant-2026-register/route.js). Members use automatic
    // capture, so circuit-mont-tremblant-2026-member-confirm normally sends the
    // "payment confirmed" notify moments later — this is the earlier
    // "someone's paying right now" signal that route never had, closing the
    // same member-vs-non-member notify gap HTM's register route fixed.
    if (process.env.RESEND_API_KEY && !_health_check) {
      after(() =>
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Canvas Routes <info@canvasroutes.com>',
            to: 'jerry@canvasroutes.com',
            subject: `Registration Started — ${memberName} (Member)`,
            html: buildAdminNotifyHtml('Member registration started — payment processing', [
              ['Name',    `<strong>${memberName}</strong>`],
              ['Email',   `<a href="mailto:${normalEmail}" style="color:#1a1a1a;">${normalEmail}</a>`],
              ['Amount',  `$${(memberTotalWithTax / 100).toFixed(2)} CAD incl. tax`],
              ['Vehicle', fullCar],
              ['Message', more || '—'],
              ['PI',      pi.id],
            ]),
          }),
        }).then(r => { if (r && !r.ok) captureMessage(`Resend non-200 — cmt-member-register-admin-notify`, { status: r.status }) }).catch(err => captureException(err, { context: 'cmt-member-register-admin-notify', email: normalEmail }))
      )
    }

    return Response.json({ clientSecret: pi.client_secret })
  } catch (err) {
    captureException(err, { context: 'cmt-member-create-pi', email: normalEmail })
    return Response.json({ error: 'Failed to initialise payment. Please try again.' }, { status: 500 })
  }
}
