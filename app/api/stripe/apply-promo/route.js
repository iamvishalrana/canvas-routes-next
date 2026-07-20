import { stripe } from '../../../../lib/stripe.js'
import { checkRateLimit, acquireLock, releaseLock, getClientIp } from '../../../../lib/rateLimit.js'
import { captureException } from '../../../../lib/sentry.js'
import { PRICES } from '../../../../lib/prices.js'
import { computeTax } from '../../../../lib/tax.js'
import { createAdminClient } from '../../../../lib/supabase/admin'

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

  // Remove promo: reset to canonical price — use original_amount (pre-tax subtotal)
  // from metadata when available, then re-add tax on top.
  if (remove) {
    const removeLockKey = `promo:${paymentIntentId}`
    const removeLocked = await acquireLock(removeLockKey, 10)
    if (!removeLocked) return Response.json({ error: 'Another request is in progress. Please try again.' }, { status: 409 })
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
      if (pi.metadata?.email?.toLowerCase().trim() !== callerEmail) {
        await releaseLock(removeLockKey)
        return Response.json({ error: 'Invalid request.' }, { status: 400 })
      }
      const baseSubtotal = pi.metadata?.original_amount
        ? parseInt(pi.metadata.original_amount, 10)
        : PRICES[pi.metadata?.type]
      if (!baseSubtotal) {
        await releaseLock(removeLockKey)
        return Response.json({ error: 'Invalid request.' }, { status: 400 })
      }
      const { gst, qst, tax, total: canonicalAmount } = computeTax(baseSubtotal)
      await stripe.paymentIntents.update(paymentIntentId, {
        amount: canonicalAmount,
        metadata: { ...pi.metadata, promo_code_id: '', discount_amount: '' },
      })
      await releaseLock(removeLockKey)
      return Response.json({ success: true, originalAmount: canonicalAmount, subtotal: baseSubtotal, gst, qst, tax })
    } catch (err) {
      try { await releaseLock(removeLockKey) } catch {}
      captureException(err, { context: 'stripe-remove-promo', paymentIntentId })
      return Response.json({ error: 'Failed to remove promo code.' }, { status: 500 })
    }
  }

  // Apply promo: validate code and update payment intent
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // Acquire a global per-code lock FIRST to prevent two users simultaneously
  // redeeming the last available use before Stripe deactivates the code.
  const codeLockKey = `promo:code:${code.trim().toUpperCase()}`
  const codeLocked = await acquireLock(codeLockKey, 10)
  if (!codeLocked) return Response.json({ error: 'Another request is in progress. Please try again.' }, { status: 409 })

  try {
    // Look up active promotion code in Stripe (inside the code lock)
    const promoCodes = await stripe.promotionCodes.list({
      code: code.trim().toUpperCase(),
      active: true,
      limit: 1,
      expand: ['data.coupon'],
    })

    if (!promoCodes.data.length) {
      await releaseLock(codeLockKey)
      return Response.json({ error: 'Invalid or expired promo code.' }, { status: 400 })
    }

    const promoCode = promoCodes.data[0]
    const coupon = promoCode.coupon

    if (!coupon || typeof coupon !== 'object') {
      await releaseLock(codeLockKey)
      return Response.json({ error: 'Could not validate promo code. Please try again.' }, { status: 500 })
    }
    if (!coupon.valid) {
      await releaseLock(codeLockKey)
      return Response.json({ error: 'This promo code is no longer valid.' }, { status: 400 })
    }

    // Enforce max_redemptions ourselves — this integration never uses Stripe
    // Checkout/Invoices, so Stripe's own promotion-code times_redeemed counter
    // never increments. promo_redemptions is written once a payment actually
    // succeeds (lib/paymentLedger.js), so this count reflects real usage.
    if (promoCode.max_redemptions) {
      try {
        const supabase = createAdminClient()
        const { count } = await supabase.from('promo_redemptions')
          .select('id', { count: 'exact', head: true })
          .eq('promo_code_id', promoCode.id)
        if ((count ?? 0) >= promoCode.max_redemptions) {
          await releaseLock(codeLockKey)
          return Response.json({ error: 'This promo code has reached its usage limit.' }, { status: 400 })
        }
      } catch (err) {
        captureException(err, { context: 'stripe-apply-promo-redemption-count', code })
        // fail closed is too strict for a DB hiccup on a non-security-critical
        // count — fall through and let Stripe's own validity checks stand
      }
    }

    // Acquire a per-PI lock to prevent concurrent apply calls stacking two discounts
    const lockKey = `promo:${paymentIntentId}`
    const locked = await acquireLock(lockKey, 10)
    if (!locked) {
      await releaseLock(codeLockKey)
      return Response.json({ error: 'Another request is in progress. Please try again.' }, { status: 409 })
    }

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
      await releaseLock(codeLockKey)
      return Response.json({ error: 'Invalid request.' }, { status: 400 })
    }
    // Allow promo codes on membership and road trip payments. Road trip
    // types are route-scoped as road_trip_<slug> (upcoming_routes.slug — see
    // CLAUDE.md) so this covers every route without an allowlist that needs
    // updating per route.
    const piType = pi.metadata?.type || ''
    if (!piType.startsWith('membership_') && !piType.startsWith('road_trip_')) {
      await releaseLock(lockKey)
      await releaseLock(codeLockKey)
      return Response.json({ error: 'Invalid request.' }, { status: 400 })
    }
    // If the promo code has an applies_to restriction, verify the PI type is
    // included — road_trip_any matches any route, not just one specific slug.
    const appliesToRaw = promoCode.metadata?.applies_to
    if (appliesToRaw) {
      const allowed = appliesToRaw.split(',').map(s => s.trim())
      const matchesAnyRoute = allowed.includes('road_trip_any') && piType.startsWith('road_trip_')
      if (!matchesAnyRoute && !allowed.includes(piType)) {
        await releaseLock(lockKey)
        await releaseLock(codeLockKey)
        return Response.json({ error: 'This promo code is not valid for this purchase.' }, { status: 400 })
      }
    }
    if (pi.metadata?.promo_code_id) {
      await releaseLock(lockKey)
      await releaseLock(codeLockKey)
      return Response.json({ error: 'A promo code has already been applied.' }, { status: 400 })
    }
    const currentAmount = pi.amount // tax-inclusive, no discount applied yet (anti-stacking guard above)

    // Check minimum purchase requirement — compared against the tax-inclusive
    // amount the customer would otherwise pay, matching what they see on screen.
    if (promoCode.restrictions?.minimum_amount && currentAmount < promoCode.restrictions.minimum_amount) {
      await releaseLock(lockKey)
      await releaseLock(codeLockKey)
      return Response.json({ error: `This code requires a minimum purchase of $${(promoCode.restrictions.minimum_amount / 100).toFixed(2)}.` }, { status: 400 })
    }

    // Discount off the pre-tax subtotal, never off pi.amount — pi.amount already
    // includes tax, and discounting it directly would both discount the tax
    // portion itself and leave GST/QST stale relative to the new price.
    const baseSubtotal = pi.metadata?.original_amount ? parseInt(pi.metadata.original_amount, 10) : PRICES[piType]
    if (!baseSubtotal) {
      await releaseLock(lockKey)
      await releaseLock(codeLockKey)
      return Response.json({ error: 'Invalid request.' }, { status: 400 })
    }

    let discountedSubtotal
    if (coupon.percent_off) {
      discountedSubtotal = Math.max(50, Math.round(baseSubtotal * (1 - coupon.percent_off / 100)))
    } else if (coupon.amount_off) {
      discountedSubtotal = Math.max(50, baseSubtotal - coupon.amount_off) // Stripe minimum is 50 cents
    } else {
      await releaseLock(lockKey)
      await releaseLock(codeLockKey)
      return Response.json({ error: 'Unsupported coupon type.' }, { status: 400 })
    }

    const discountAmount = baseSubtotal - discountedSubtotal
    const { gst, qst, tax, total: discountedAmount } = computeTax(discountedSubtotal)

    // Update the payment intent in-place and record the applied promo to prevent stacking
    await stripe.paymentIntents.update(paymentIntentId, {
      amount: discountedAmount,
      metadata: { ...pi.metadata, promo_code_id: promoCode.id, discount_amount: String(discountAmount) },
    })
    try { await releaseLock(lockKey) } catch {}
    try { await releaseLock(codeLockKey) } catch {}

    return Response.json({
      discountedAmount,
      originalAmount: currentAmount,
      subtotal: discountedSubtotal,
      gst,
      qst,
      tax,
      percentOff: coupon.percent_off ?? null,
      amountOff: coupon.amount_off ?? null,
      promoCodeId: promoCode.id,
    })
  } catch (err) {
    try { await releaseLock(`promo:${paymentIntentId}`) } catch {}
    try { await releaseLock(codeLockKey) } catch {}
    captureException(err, { context: 'stripe-apply-promo', code, paymentIntentId })
    return Response.json({ error: 'Failed to apply promo code.' }, { status: 500 })
  }
}
