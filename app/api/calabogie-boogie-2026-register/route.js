import { after } from 'next/server'
import { deviceType } from '../../../lib/deviceType'
import { checkRateLimit, getClientIp } from '../../../lib/rateLimit.js'
import { captureException, captureMessage } from '../../../lib/sentry.js'
import { createAdminClient } from '../../../lib/supabase/admin'
import { stripe } from '../../../lib/stripe.js'
import { buildAdminNotifyHtml } from '../../../lib/adminEmail.js'
import { computeTax } from '../../../lib/tax.js'

const EVENT_NAME = 'The Calabogie Boogie — Track Day — September 13, 2026'
const MEMBER_PRICE_CENTS    = 34900 // $349 CAD
const NONMEMBER_PRICE_CENTS = 37900 // $379 CAD

export async function POST(request) {
  if (!stripe) return Response.json({ error: 'Payments not configured.' }, { status: 503 })

  const ip = getClientIp(request)
  if (ip && await checkRateLimit(ip, 10, 60)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Check registration open via events table (Reg toggle in admin Events section)
  try {
    const supabase = createAdminClient()
    const { data: ev } = await supabase.from('events').select('public_registration_enabled').ilike('name', `${EVENT_NAME.split(' — ')[0]}%`).maybeSingle()
    if (ev && ev.public_registration_enabled === false) {
      return Response.json({ error: 'Registration is currently closed.' }, { status: 403 })
    }
  } catch { /* allow through if events table unavailable */ }

  const { name, email, phone, dob, vehicleChoice, year, carMake, carModel, rentalCar, more, source, isMember, lang, _hp, _health_check } = body
  if (_hp) return Response.json({ success: true, clientSecret: null })

  // Validate required fields
  if (!name?.trim() || name.trim().length < 2)
    return Response.json({ error: 'Full name is required.' }, { status: 400 })
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return Response.json({ error: 'A valid email address is required.' }, { status: 400 })
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
  const VALID_SOURCES = ['Instagram', 'Facebook', 'Friend / Word of mouth', 'Google', 'Other']
  if (!source || !VALID_SOURCES.includes(source))
    return Response.json({ error: 'Please tell us how you heard about us.' }, { status: 400 })

  if (name.length > 100) return Response.json({ error: 'Name too long.' }, { status: 400 })
  if (email.length > 254) return Response.json({ error: 'Email too long.' }, { status: 400 })

  const fullCarModel = vehicleChoice === 'own' ? [carMake, carModel].filter(Boolean).join(' ') : `Rental — Toyota ${rentalCar === 'GR86' ? 'GR86' : ''}${rentalCar === 'Mustang GT' ? 'Ford Mustang GT' : ''} (manual)`
  const normalEmail = email.toLowerCase().trim()

  // Parse DOB string into separate columns immediately — don't rely on webhook to do this
  let dob_month = null, dob_day = null, dob_year = null
  if (dob) {
    const [y, m, d] = dob.split('-').map(Number)
    if (m >= 1 && m <= 12) dob_month = m
    if (d >= 1 && d <= 31) dob_day = d
    if (y && y > 1900) dob_year = y
  }

  // Verify member status server-side — never trust isMember from the client body alone
  let verifiedMember = false
  if (isMember === true && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { data: member } = await createAdminClient().from('members')
        .select('id').eq('email', normalEmail).maybeSingle()
      verifiedMember = !!member
    } catch { /* fall back to non-member price */ }
  }
  const amountCents = verifiedMember ? MEMBER_PRICE_CENTS : NONMEMBER_PRICE_CENTS

  // Save to DB as pending before creating PI
  let existing = null  // declared here so it's in scope for the PI-cancel logic below
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) try {
    const supabase = createAdminClient()
    const { data: existingData } = await supabase.from('applications').select('id, registrations, stripe_payment_intent_id').eq('email', normalEmail).maybeSingle()
    existing = existingData

    const existingReg = (existing?.registrations || []).find(r => r.event === EVENT_NAME)
    // Per-event paid flag, not the shared stripe_payment_status column (which
    // gets overwritten by any other flow the same email later touches) — see
    // lib/markRegistrationPaid.js for why.
    if (existingReg?.paid) {
      return Response.json({ error: 'This email has already registered and paid for this event.' }, { status: 400 })
    }
    const newReg = {
      event: EVENT_NAME,
      registered_at: existingReg?.registered_at || new Date().toISOString(),
      attended: existingReg?.attended ?? null,
      paid: existingReg?.paid ?? false,
    }
    const registrations = [...(existing?.registrations || []).filter(r => r.event !== EVENT_NAME), newReg]

    const { data: appData, error: upsertErr } = await supabase.from('applications').upsert({
      device_type: deviceType(request),
      email: normalEmail,
      name: name.trim(),
      car_year: vehicleChoice === 'own' ? year.trim() : null,
      car_make: vehicleChoice === 'own' ? (carMake?.trim() || null) : null,
      car_model: fullCarModel,
      phone: phone || null,
      more: more || null,
      source: source || null,
      dob: dob || null,
      dob_month: dob_month || null,
      dob_day: dob_day || null,
      dob_year: dob_year || null,
      registrations,
      lang: lang === 'fr' ? 'fr' : 'en',
      stripe_payment_status: 'pending',
      // New payment cycle — clear the previous flow's capture timestamp so the
      // confirm route's email claim and the webhook's already-captured check
      // (both keyed on stripe_paid_at) work for this registration
      stripe_paid_at: null,
      ...(existing ? { reregistered_at: new Date().toISOString() } : {}),
    }, { onConflict: 'email' }).select('id').single()

    if (upsertErr) {
      captureException(upsertErr, { context: 'calabogie-register-db-upsert', email: normalEmail })
    } else if (appData?.id) {
      const { error: contactErr } = await supabase.from('contacts').upsert(
        { application_id: appData.id },
        { onConflict: 'application_id', ignoreDuplicates: true }
      )
      if (contactErr) captureException(contactErr, { context: 'calabogie-register-contacts', email: normalEmail })
    }
  } catch (e) {
    captureException(e, { context: 'calabogie-register-db', email: normalEmail })
  }

  // Create Stripe PaymentIntent — manual capture (hold only)
  const { total: totalWithTax } = computeTax(amountCents)
  try {
    const pi = await stripe.paymentIntents.create({
      amount: totalWithTax,
      currency: 'cad',
      receipt_email: normalEmail,
      metadata: {
        type: 'road_trip_the-calabogie-boogie',
        email: normalEmail,
        name: name.trim(),
        event_name: EVENT_NAME,
        is_member: verifiedMember ? 'yes' : 'no',
        car_year: vehicleChoice === 'own' ? year.trim() : '',
        car_make: vehicleChoice === 'own' ? carMake.trim() : '',
        car_model: fullCarModel,
        vehicle_choice: vehicleChoice,
        rental_car: vehicleChoice === 'rental' ? rentalCar : '',
        original_amount: String(amountCents),
        phone: phone || '',
        dob: dob || '',
        source: source || '',
        lang: lang === 'fr' ? 'fr' : 'en',
        message: (more || '').slice(0, 450), // Stripe metadata values cap at 500 chars
        ...(_health_check ? {
          source: 'health_check',
          health_check_note: '⚠️ AUTOMATED PLAYWRIGHT HEALTH CHECK — NOT A REAL PAYMENT — SAFE TO CANCEL',
        } : {}),
      },
      description: `Canvas Routes — ${EVENT_NAME}`,
      automatic_payment_methods: { enabled: true },
      capture_method: 'manual',
    })

    // Cancel the previous PI if re-registering — prevents ghost holds. The
    // applications row shares ONE stripe_payment_intent_id across membership and
    // every road trip, so verify the stored PI belongs to THIS flow before
    // cancelling — a blind cancel can release a live hold from another flow.
    if (existing?.stripe_payment_intent_id && existing.stripe_payment_intent_id !== pi.id) {
      stripe.paymentIntents.retrieve(existing.stripe_payment_intent_id).then(prev => {
        if (prev.metadata?.type === 'road_trip_the-calabogie-boogie' && prev.status !== 'succeeded') {
          return stripe.paymentIntents.cancel(existing.stripe_payment_intent_id)
        }
      }).catch(() => {})
    }

    // Store PI ID immediately so the admin capture route can find this row
    // even if the payment_intent.requires_capture webhook hasn't fired yet.
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const _sb = createAdminClient()
      const { error: piStoreErr } = await _sb.from('applications')
        .update({ stripe_payment_intent_id: pi.id, stripe_payment_type: 'road_trip_the-calabogie-boogie' })
        .eq('email', normalEmail)
      if (piStoreErr) captureException(piStoreErr, { context: 'calabogie-register-pi-store', email: normalEmail })
    }

    // Notify Jerry immediately when someone reaches the payment step — belt-and-suspenders
    // against the webhook failing to fire. The webhook sends the full notification on
    // requires_capture; this is a lightweight heads-up so new registrations are never missed.
    if (process.env.RESEND_API_KEY && !_health_check) {
      after(() =>
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Canvas Routes <info@canvasroutes.com>',
            to: 'jerry@canvasroutes.com',
            subject: `Registration Started — ${name.trim()}`,
            html: buildAdminNotifyHtml('Registration started — hold pending', [
              ['Name',      `<strong>${name.trim()}</strong>`],
              ['Email',     `<a href="mailto:${normalEmail}" style="color:#1a1a1a;">${normalEmail}</a>`],
              ['Phone',     phone || '—'],
              ['DOB',       dob_month ? `${dob_month}/${dob_day}${dob_year ? `/${dob_year}` : ''}` : '—'],
              ['Amount',    `$${(totalWithTax / 100).toFixed(2)} CAD incl. tax (hold)`],
              ['Vehicle',   fullCarModel],
              ['Source',    source],
              ['Message',   more || '—'],
              ['PI',        pi.id],
            ]),
          }),
        }).then(r => { if (r && !r.ok) captureMessage(`Resend non-200 — calabogie-register-admin-notify`, { status: r.status }) }).catch(err => captureException(err, { context: 'calabogie-register-admin-notify', email: normalEmail }))
      )
    }

    return Response.json({ clientSecret: pi.client_secret })
  } catch (err) {
    captureException(err, { context: 'calabogie-create-payment-intent', email: normalEmail })
    return Response.json({ error: 'Failed to initialise payment. Please try again.' }, { status: 500 })
  }
}
