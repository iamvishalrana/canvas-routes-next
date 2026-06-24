import { stripe } from '../../../../lib/stripe.js'
import { checkRateLimit, acquireLock, releaseLock } from '../../../../lib/rateLimit.js'
import { captureException } from '../../../../lib/sentry.js'
import { PRICES } from '../../../../lib/prices.js'

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

  const { code, paymentIntentId, email, remove } = body

  if (!paymentIntentId || typeof paymentIntentId !== 'string' || !paymentIntentId.startsWith('pi_')) {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // Require the caller to identify themselves — the email must match the PI's metadata
  // so promo codes can't be applied to another user's payment intent
  const callerEmail = email?.toLowerCase().trim()
  if (!callerEmail) {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // Remove promo: reset to canonical price — use original_amount from metadata when available
  if (remove) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
      if (pi.metadata?.email?.toLowerCase().trim() !== callerEmail) {
        return Response.json({ error: 'Invalid request.' }, { status: 400 })
      }
      const canonicalAmount = pi.metadata?.original_amount
        ? parseInt(pi.metadata.original_amount, 10)
        : PRICES[pi.metadata?.type]
      if (!canonicalAmount) {
        return Response.json({ error: 'Invalid request.' }, { status: 400 })
      }
      await stripe.paymentIntents.update(paymentIntentId, {
        amount: canonicalAmount,
        metadata: { ...pi.metadata, promo_code_id: '' },
      })
      return Response.json({ success: true, originalAmount: canonicalAmount })
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

    if (!coupon || typeof coupon !== 'object') {
      return Response.json({ error: 'Could not validate promo code. Please try again.' }, { status: 500 })
    }
    if (!coupon.valid) {
      return Response.json({ error: 'This promo code is no longer valid.' }, { status: 400 })
    }

    // Acquire a per-PI lock to prevent concurrent apply calls stacking two discounts
    const lockKey = `promo:${paymentIntentId}`
    const locked = await acquireLock(lockKey, 10)
    if (!locked) return Response.json({ error: 'Another request is in progress. Please try again.' }, { status: 409 })

    // Get current payment intent amount and guard against stacking
    let pi
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    } catch (err) {
      await releaseLock(lockKey)
      throw err
    }
    // Verify the PI belongs to the caller
    if (pi.metadata?.email?.toLowerCase().trim() !== callerEmail) {
      await releaseLock(lockKey)
      return Response.json({ error: 'Invalid request.' }, { status: 400 })
    }
    // Allow promo codes on membership and WTET road trip payments
    const allowedTypes = ['membership_routes', 'membership_inner_circle', 'road_trip_wtet']
    if (!allowedTypes.includes(pi.metadata?.type)) {
      await releaseLock(lockKey)
      return Response.json({ error: 'Invalid request.' }, { status: 400 })
    }
    if (pi.metadata?.promo_code_id) {
      await releaseLock(lockKey)
      return Response.json({ error: 'A promo code has already been applied.' }, { status: 400 })
    }
    const currentAmount = pi.amount

    // Check minimum purchase requirement
    if (promoCode.restrictions?.minimum_amount && currentAmount < promoCode.restrictions.minimum_amount) {
      await releaseLock(lockKey)
      return Response.json({ error: `This code requires a minimum purchase of $${(promoCode.restrictions.minimum_amount / 100).toFixed(2)}.` }, { status: 400 })
    }

    // Calculate discounted amount
    let discountedAmount
    if (coupon.percent_off) {
      discountedAmount = Math.max(50, Math.round(currentAmount * (1 - coupon.percent_off / 100)))
    } else if (coupon.amount_off) {
      discountedAmount = Math.max(50, currentAmount - coupon.amount_off) // Stripe minimum is 50 cents
    } else {
      return Response.json({ error: 'Unsupported coupon type.' }, { status: 400 })
    }

    // Update the payment intent in-place and record the applied promo to prevent stacking
    await stripe.paymentIntents.update(paymentIntentId, {
      amount: discountedAmount,
      metadata: { ...pi.metadata, promo_code_id: promoCode.id },
    })
    try { await releaseLock(lockKey) } catch {}

    return Response.json({
      discountedAmount,
      originalAmount: currentAmount,
      percentOff: coupon.percent_off ?? null,
      amountOff: coupon.amount_off ?? null,
      promoCodeId: promoCode.id,
    })
  } catch (err) {
    try { await releaseLock(`promo:${paymentIntentId}`) } catch {}
    captureException(err, { context: 'stripe-apply-promo', code, paymentIntentId })
    return Response.json({ error: 'Failed to apply promo code.' }, { status: 500 })
  }
}
