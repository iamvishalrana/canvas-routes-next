import { stripe } from '../../../../lib/stripe.js'
import { checkRateLimit } from '../../../../lib/rateLimit.js'
import { captureException } from '../../../../lib/sentry.js'

export async function POST(request) {
  if (!stripe) {
    return Response.json({ error: 'Payments not configured.' }, { status: 503 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
  if (ip && await checkRateLimit(ip)) {
    return Response.json({ error: 'Too many requests.' }, { status: 429 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { code, paymentIntentId, remove, originalAmount } = body

  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // Remove promo: reset the payment intent to original amount
  if (remove) {
    if (!originalAmount || typeof originalAmount !== 'number') {
      return Response.json({ error: 'Invalid request.' }, { status: 400 })
    }
    try {
      await stripe.paymentIntents.update(paymentIntentId, { amount: originalAmount })
      return Response.json({ success: true })
    } catch (err) {
      captureException(err, { context: 'stripe-remove-promo', paymentIntentId })
      return Response.json({ error: 'Failed to remove promo code.' }, { status: 500 })
    }
  }

  // Apply promo: validate code and update payment intent
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  try {
    // Look up active promotion code in Stripe
    const promoCodes = await stripe.promotionCodes.list({
      code: code.trim().toUpperCase(),
      active: true,
      limit: 1,
      expand: ['data.coupon'],
    })

    if (!promoCodes.data.length) {
      return Response.json({ error: 'Invalid or expired promo code.' }, { status: 400 })
    }

    const promoCode = promoCodes.data[0]
    const coupon = promoCode.coupon

    if (!coupon.valid) {
      return Response.json({ error: 'This promo code is no longer valid.' }, { status: 400 })
    }

    // Get current payment intent amount
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    const currentAmount = pi.amount

    // Check minimum purchase requirement
    if (promoCode.restrictions?.minimum_amount && currentAmount < promoCode.restrictions.minimum_amount) {
      return Response.json({ error: `This code requires a minimum purchase of $${(promoCode.restrictions.minimum_amount / 100).toFixed(2)}.` }, { status: 400 })
    }

    // Calculate discounted amount
    let discountedAmount
    if (coupon.percent_off) {
      discountedAmount = Math.round(currentAmount * (1 - coupon.percent_off / 100))
    } else if (coupon.amount_off) {
      discountedAmount = Math.max(50, currentAmount - coupon.amount_off) // Stripe minimum is 50 cents
    } else {
      return Response.json({ error: 'Unsupported coupon type.' }, { status: 400 })
    }

    // Update the payment intent in-place
    await stripe.paymentIntents.update(paymentIntentId, { amount: discountedAmount })

    return Response.json({
      discountedAmount,
      originalAmount: currentAmount,
      percentOff: coupon.percent_off ?? null,
      amountOff: coupon.amount_off ?? null,
      promoCodeId: promoCode.id,
    })
  } catch (err) {
    captureException(err, { context: 'stripe-apply-promo', code, paymentIntentId })
    return Response.json({ error: 'Failed to apply promo code.' }, { status: 500 })
  }
}
