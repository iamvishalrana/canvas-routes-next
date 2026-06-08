import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { stripe } from '../../../../lib/stripe.js'
import { captureException } from '../../../../lib/sentry.js'

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  try {
    const promoCodes = await stripe.promotionCodes.list({ limit: 100, expand: ['data.coupon'] })
    return Response.json(promoCodes.data)
  } catch (err) {
    captureException(err, { context: 'admin-promo-codes-list' })
    return Response.json({ error: 'Failed to fetch promo codes.' }, { status: 500 })
  }
}

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { code, percentOff, amountOff, maxRedemptions, expiresAt } = body

  if (!code?.trim()) return Response.json({ error: 'Code is required.' }, { status: 400 })
  if (!percentOff && !amountOff) return Response.json({ error: 'A discount value is required.' }, { status: 400 })

  try {
    const coupon = await stripe.coupons.create({
      percent_off: percentOff || undefined,
      amount_off: amountOff ? Math.round(amountOff * 100) : undefined,
      currency: amountOff ? 'cad' : undefined,
      duration: 'once',
    })

    const promoCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: code.trim().toUpperCase(),
      max_redemptions: maxRedemptions || undefined,
      expires_at: expiresAt ? Math.floor(new Date(expiresAt).getTime() / 1000) : undefined,
    })

    return Response.json(promoCode)
  } catch (err) {
    captureException(err, { context: 'admin-promo-codes-create' })
    return Response.json({ error: err.message || 'Failed to create promo code.' }, { status: 500 })
  }
}
