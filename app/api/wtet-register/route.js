import { checkRateLimit } from '../../../lib/rateLimit.js'
import { captureException } from '../../../lib/sentry.js'
import { createAdminClient } from '../../../lib/supabase/admin'
import { stripe } from '../../../lib/stripe.js'

const EVENT_NAME = 'Whips to Eastern Townships — July 5, 2026'
const MEMBER_PRICE_CENTS    = 17900 // $179 CAD
const NONMEMBER_PRICE_CENTS = 19900 // $199 CAD
// Must match the override in app/api/public/settings/route.js
const WTET_REGISTRATION_OPEN = new Date('2026-06-24T21:00:00Z') // 4 pm EST

export async function POST(request) {
  if (!stripe) return Response.json({ error: 'Payments not configured.' }, { status: 503 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
  if (ip && await checkRateLimit(ip, 10, 60)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Check registration open setting
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createAdminClient()
      const { data: setting } = await supabase.from('settings').select('value').eq('key', 'event_registration_open').maybeSingle()
      // Apply the same time-based override as public/settings — once the launch
      // time passes, the DB value is irrelevant and registration is always open.
      const autoOpen = new Date() >= WTET_REGISTRATION_OPEN
      if (setting?.value === 'false' && !autoOpen) {
        return Response.json({ error: 'Registration is currently closed.' }, { status: 403 })
      }
    } catch { /* allow through if settings table unavailable */ }
  }

  const { name, email, year, carMake, carModel, phone, instagram, passengers, hasChildren, childrenAges, more, source, dob, isMember, _hp } = body
  const amountCents = isMember === true ? MEMBER_PRICE_CENTS : NONMEMBER_PRICE_CENTS
  if (_hp) return Response.json({ success: true, clientSecret: null })

  // Validate required fields
  if (!name?.trim() || name.trim().length < 2)
    return Response.json({ error: 'Full name is required.' }, { status: 400 })
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return Response.json({ error: 'A valid email address is required.' }, { status: 400 })
  if (!year?.trim()) return Response.json({ error: 'Car year is required.' }, { status: 400 })
  if (!carMake?.trim()) return Response.json({ error: 'Car make is required.' }, { status: 400 })
  if (!carModel?.trim()) return Response.json({ error: 'Car model is required.' }, { status: 400 })
  if (!passengers) return Response.json({ error: 'Number of passengers is required.' }, { status: 400 })
  if (!hasChildren) return Response.json({ error: 'Please answer the children question.' }, { status: 400 })
  if (hasChildren === 'yes' && !childrenAges?.trim()) return Response.json({ error: 'Please provide the ages of children attending.' }, { status: 400 })
  const VALID_SOURCES = ['Instagram', 'Facebook', 'Friend / Word of mouth', 'Google', 'Other']
  if (!source || !VALID_SOURCES.includes(source))
    return Response.json({ error: 'Please tell us how you heard about us.' }, { status: 400 })

  if (name.length > 100) return Response.json({ error: 'Name too long.' }, { status: 400 })
  if (email.length > 254) return Response.json({ error: 'Email too long.' }, { status: 400 })

  const fullCarModel = [carMake, carModel].filter(Boolean).join(' ')
  const normalEmail = email.toLowerCase().trim()
  const firstName = name.trim().split(' ')[0]

  // Save to DB as pending before creating PI
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) try {
    const supabase = createAdminClient()
    const { data: existing } = await supabase.from('applications').select('id, registrations').eq('email', normalEmail).maybeSingle()

    const existingReg = (existing?.registrations || []).find(r => r.event === EVENT_NAME)
    const newReg = {
      event: EVENT_NAME,
      registered_at: existingReg?.registered_at || new Date().toISOString(),
      attended: existingReg?.attended ?? null,
    }
    const registrations = [...(existing?.registrations || []).filter(r => r.event !== EVENT_NAME), newReg]

    const { data: appData, error: upsertErr } = await supabase.from('applications').upsert({
      email: normalEmail,
      name: name.trim(),
      car_year: year.trim(),
      car_make: carMake?.trim() || null,
      car_model: fullCarModel,
      phone: phone || null,
      instagram: instagram ? instagram.trim().replace(/^@+/, '') : null,
      passengers: passengers || null,
      has_children: hasChildren || null,
      children_ages: childrenAges || null,
      more: more || null,
      source: source || null,
      dob: dob || null,
      registrations,
      stripe_payment_status: 'pending',
      ...(existing ? { reregistered_at: new Date().toISOString() } : {}),
    }, { onConflict: 'email' }).select('id').single()

    if (upsertErr) {
      captureException(upsertErr, { context: 'wtet-register-db-upsert', email: normalEmail })
    } else if (appData?.id) {
      await supabase.from('contacts').upsert(
        { application_id: appData.id },
        { onConflict: 'application_id', ignoreDuplicates: true }
      ).catch(err => captureException(err, { context: 'wtet-register-contacts', email: normalEmail }))
    }
  } catch (e) {
    captureException(e, { context: 'wtet-register-db', email: normalEmail })
  }

  // Create Stripe PaymentIntent — immediate capture
  try {
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'cad',
      receipt_email: normalEmail,
      metadata: {
        type: 'road_trip_wtet',
        email: normalEmail,
        name: name.trim(),
        event_name: EVENT_NAME,
        is_member: isMember ? 'yes' : 'no',
        car_year: year.trim(),
        car_make: carMake.trim(),
        car_model: fullCarModel,
        passengers: passengers || '',
        has_children: hasChildren || '',
        children_ages: childrenAges || '',
        original_amount: String(amountCents),
      },
      description: `Canvas Routes — ${EVENT_NAME}`,
      automatic_payment_methods: { enabled: true },
      capture_method: 'manual',
    })
    return Response.json({ clientSecret: pi.client_secret })
  } catch (err) {
    captureException(err, { context: 'wtet-create-payment-intent', email: normalEmail })
    return Response.json({ error: 'Failed to initialise payment. Please try again.' }, { status: 500 })
  }
}
