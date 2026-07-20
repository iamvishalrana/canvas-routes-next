import { stripe } from '../../../../lib/stripe.js'
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit.js'
import { captureException } from '../../../../lib/sentry.js'
import { PRICES } from '../../../../lib/prices.js'
import { computeTax } from '../../../../lib/tax.js'

const VALID_TYPES = Object.keys(PRICES)

export async function POST(request) {
  if (!stripe) {
    return Response.json({ error: 'Payments not configured.' }, { status: 503 })
  }

  const ip = getClientIp(request)
    || 'unknown'
  if (await checkRateLimit(ip)) {
    return Response.json({ error: 'Too many requests.' }, { status: 429 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // For membership PIs, accept optional form fields to store in metadata.
  // This ensures the webhook rescue path can write full application data
  // even if the client closes the tab before /api/membership-waitlist fires.
  const { type, email, name, eventName, phone, dob, year, carMake, carModel, source, referredBy, carPaint, more, previousPiId, _health_check } = body

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
  const { total } = computeTax(PRICES[type])

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   total,
      currency: 'cad',
      receipt_email: email,
      metadata: {
        type,
        email:      email.toLowerCase().trim(),
        name:       name.trim(),
        event_name: eventName || '',
        original_amount: String(PRICES[type]), // pre-tax subtotal — apply-promo discounts off this, never off `amount`
        // Membership-only fields stored so webhook can rescue form data on tab-close
        ...(isMembership ? {
          phone:       phone    || '',
          dob:         dob      || '',
          car_year:    year     || '',
          car_make:    carMake  || '',
          car_model:   carModel || '',
          source:      source   || '',
          referred_by: (referredBy || '').slice(0, 200),
          car_paint:   (carPaint  || '').slice(0, 100),
          more:        (more      || '').slice(0, 450), // Stripe metadata values cap at 500 chars
        } : {}),
        ...(_health_check ? {
          source: 'health_check',
          health_check_note: '⚠️ AUTOMATED PLAYWRIGHT HEALTH CHECK — NOT A REAL PAYMENT — SAFE TO CANCEL',
        } : {}),
      },
      description: buildDescription(type, eventName),
      automatic_payment_methods: { enabled: true },
      // Membership payments are authorize-only — admin reviews and captures manually.
      // capture_method: 'manual' is fully compatible with Apple Pay.
      ...(isMembership ? { capture_method: 'manual' } : {}),
    })

    // Cancel the old PI if the user went back and re-submitted (e.g. tier switch) — prevents
    // ghost holds. The ID arrives from the client, so verify ownership and status first:
    // never cancel a PI that belongs to someone else or already carries a hold/charge.
    if (previousPiId && typeof previousPiId === 'string' && previousPiId.startsWith('pi_') && previousPiId !== paymentIntent.id) {
      stripe.paymentIntents.retrieve(previousPiId).then(prev => {
        const prevEmail = prev.metadata?.email?.toLowerCase().trim()
        const unconfirmed = ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(prev.status)
        if (prevEmail === email.toLowerCase().trim() && unconfirmed) {
          return stripe.paymentIntents.cancel(previousPiId)
        }
      }).catch(() => {})
    }

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
