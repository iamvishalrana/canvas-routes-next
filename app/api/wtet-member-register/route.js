import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { stripe } from '../../../lib/stripe.js'
import { checkRateLimit } from '../../../lib/rateLimit.js'
import { captureException } from '../../../lib/sentry.js'

const EVENT_NAME = 'Whips to Eastern Townships — July 5, 2026'
const MEMBER_PRICE_CENTS = 17900 // $179 CAD

export async function GET() {
  // Returns member's existing WTET registration status
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

    const wtetReg = (reg?.registrations || []).find(r => r.event === EVENT_NAME)
    const status = reg?.stripe_payment_status || null
    const alreadyRegistered = wtetReg && ['authorized', 'paid'].includes(status)

    return Response.json({ alreadyRegistered: !!alreadyRegistered, status })
  } catch (e) {
    captureException(e, { context: 'wtet-member-register-get' })
    return Response.json({ alreadyRegistered: false, status: null })
  }
}

export async function POST(request) {
  if (!stripe) return Response.json({ error: 'Payments not configured.' }, { status: 503 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
  if (ip && await checkRateLimit(ip, 10, 60)) {
    return Response.json({ error: 'Too many requests.' }, { status: 429 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { carYear, carMake, carModel, passengers, hasChildren, childrenAges, source, dietary, more } = body
  const normalEmail = user.email.toLowerCase().trim()

  // Duplicate guard — one per member
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('applications')
    .select('id, stripe_payment_status, registrations')
    .eq('email', normalEmail)
    .maybeSingle()

  const existingWtet = (existing?.registrations || []).find(r => r.event === EVENT_NAME)
  if (existingWtet && ['authorized', 'paid'].includes(existing?.stripe_payment_status)) {
    return Response.json({ error: 'You have already registered for this event.' }, { status: 400 })
  }

  // Validate
  if (!carYear?.trim()) return Response.json({ error: 'Car year is required.' }, { status: 400 })
  if (!carMake?.trim()) return Response.json({ error: 'Car make is required.' }, { status: 400 })
  if (!carModel?.trim()) return Response.json({ error: 'Car model is required.' }, { status: 400 })
  if (!passengers) return Response.json({ error: 'Number of passengers is required.' }, { status: 400 })
  if (!hasChildren) return Response.json({ error: 'Please answer the children question.' }, { status: 400 })

  // Get member name for emails
  const { data: member } = await admin.from('members').select('name').eq('id', user.id).maybeSingle()
  const memberName = member?.name?.trim() || normalEmail.split('@')[0]
  const fullCar = [carMake.trim(), carModel.trim()].filter(Boolean).join(' ')

  // Save to DB as pending
  try {
    const newReg = {
      event: EVENT_NAME,
      registered_at: new Date().toISOString(),
      attended: null,
    }
    const prevRegs = (existing?.registrations || []).filter(r => r.event !== EVENT_NAME)
    const registrations = [...prevRegs, newReg]

    const { data: appData, error: upsertErr } = await admin.from('applications').upsert({
      email: normalEmail,
      name: memberName,
      car_year: carYear.trim(),
      car_make: carMake.trim(),
      car_model: fullCar,
      source: source || null,
      more: [dietary ? `Dietary: ${dietary}` : null, more || null].filter(Boolean).join('\n\n') || null,
      registrations,
      stripe_payment_status: 'pending',
      ...(existing ? { reregistered_at: new Date().toISOString() } : {}),
    }, { onConflict: 'email' }).select('id').single()

    if (upsertErr) captureException(upsertErr, { context: 'wtet-member-register-db', email: normalEmail })
    else if (appData?.id) {
      await admin.from('contacts').upsert(
        { application_id: appData.id },
        { onConflict: 'application_id', ignoreDuplicates: true }
      ).catch(err => captureException(err, { context: 'wtet-member-register-contacts' }))
    }
  } catch (e) {
    captureException(e, { context: 'wtet-member-register-db-outer', email: normalEmail })
  }

  // Create Stripe PI — immediate capture for members (vetted, no manual review needed)
  try {
    const pi = await stripe.paymentIntents.create({
      amount: MEMBER_PRICE_CENTS,
      currency: 'cad',
      receipt_email: normalEmail,
      metadata: {
        type: 'road_trip_wtet',
        email: normalEmail,
        name: memberName,
        event_name: EVENT_NAME,
        is_member: 'yes',
        member_id: user.id,
        passengers: passengers || '',
        has_children: hasChildren || '',
      },
      description: `Canvas Routes — ${EVENT_NAME} (Member rate)`,
      automatic_payment_methods: { enabled: true },
    })
    return Response.json({ clientSecret: pi.client_secret })
  } catch (err) {
    captureException(err, { context: 'wtet-member-create-pi', email: normalEmail })
    return Response.json({ error: 'Failed to initialise payment. Please try again.' }, { status: 500 })
  }
}
