import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { stripe } from '../../../../lib/stripe.js'

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  const promoCodes = await stripe.promotionCodes.list({ limit: 100, expand: ['data.coupon'] })
  return Response.json(promoCodes.data)
}

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  const { code, percentOff, amountOff, maxRedemptions, expiresAt } = await request.json()

  if (!code?.trim()) return Response.json({ error: 'Code is required.' }, { status: 400 })
  if (!percentOff && !amountOff) return Response.json({ error: 'A discount value is required.' }, { status: 400 })

  const coupon = await stripe.coupons.create({
    percent_off: percentOff || undefined,
    amount_off: amountOff ? amountOff * 100 : undefined,
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
}
