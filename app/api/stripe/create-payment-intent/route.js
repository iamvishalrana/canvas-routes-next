import { stripe } from '../../../../lib/stripe.js'
import { checkRateLimit } from '../../../../lib/rateLimit.js'
import { captureException } from '../../../../lib/sentry.js'
import { PRICES } from '../../../../lib/prices.js'

const VALID_TYPES = Object.keys(PRICES)

export async function POST(request) {
  if (!stripe) {
    return Response.json({ error: 'Payments not configured.' }, { status: 503 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown'
  if (await checkRateLimit(ip)) {
    return Response.json({ error: 'Too many requests.' }, { status: 429 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { type, email, name, eventName } = body

  if (!type || !VALID_TYPES.includes(type)) {
    return Response.json({ error: 'Invalid payment type.' }, { status: 400 })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Valid email required.' }, { status: 400 })
  }
  if (!name?.trim()) {
    return Response.json({ error: 'Name required.' }, { status: 400 })
  }

  const isMembership = type.startsWith('membership_')

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   PRICES[type],
      currency: 'cad',
      receipt_email: email,
      metadata: {
        type,
        email:     email.toLowerCase().trim(),
        name:      name.trim(),
        event_name: eventName || '',
      },
      description: buildDescription(type, eventName),
      automatic_payment_methods: { enabled: true },
      // Membership payments are authorize-only — admin reviews and captures manually.
      // capture_method: 'manual' is fully compatible with Apple Pay.
      ...(isMembership ? { capture_method: 'manual' } : {}),
    })

    return Response.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    captureException(err, { context: 'stripe-create-payment-intent', type, email })
    return Response.json({ error: 'Failed to initialise payment.' }, { status: 500 })
  }
}

function buildDescription(type, eventName) {
  switch (type) {
    case 'road_trip_standard':     return `Canvas Routes Road Trip — ${eventName || 'Standard'}`
    case 'road_trip_member':       return `Canvas Routes Road Trip — ${eventName || 'Member rate'}`
    case 'road_trip_inner_circle': return `Canvas Routes Road Trip — ${eventName || 'Inner Circle rate'}`
    case 'membership_routes':      return 'Canvas Routes — Routes Member (2026 Season)'
    case 'membership_inner_circle':return 'Canvas Routes — Inner Circle (2026 Season)'
    default:                       return 'Canvas Routes'
  }
}
