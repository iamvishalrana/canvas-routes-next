import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../lib/adminAudit.js'
import { stripe } from '../../../../lib/stripe.js'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureException } from '../../../../lib/sentry.js'

export async function GET() {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  try {
    const promoCodes = await stripe.promotionCodes.list({ limit: 100, expand: ['data.coupon'] })

    // Stripe's own times_redeemed never increments in this integration (we
    // never use Checkout/Invoices) — override it with the real count from
    // promo_redemptions, written whenever a payment with this code actually
    // succeeds (lib/paymentLedger.js).
    const supabase = createAdminClient()
    const { data: redemptions } = await supabase.from('promo_redemptions').select('promo_code_id')
    const counts = {}
    for (const r of (redemptions || [])) counts[r.promo_code_id] = (counts[r.promo_code_id] || 0) + 1

    const enriched = promoCodes.data.map(pc => ({ ...pc, times_redeemed: counts[pc.id] || 0 }))
    return Response.json(enriched)
  } catch (err) {
    captureException(err, { context: 'admin-promo-codes-list' })
    return Response.json({ error: 'Failed to fetch promo codes.' }, { status: 500 })
  }
}

export async function POST(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { code, percentOff, amountOff, maxRedemptions, expiresAt, appliesTo, minimumAmount } = body

  if (!code?.trim()) return Response.json({ error: 'Code is required.' }, { status: 400 })
  if (!percentOff && !amountOff) return Response.json({ error: 'A discount value is required.' }, { status: 400 })
  const minAmt = minimumAmount === undefined || minimumAmount === '' ? null : parseFloat(minimumAmount)
  if (minAmt !== null && (!Number.isFinite(minAmt) || minAmt <= 0)) {
    return Response.json({ error: 'Minimum purchase must be a positive amount.' }, { status: 400 })
  }

  // Route options are dynamic — every row in upcoming_routes (active or not,
  // launched or not) is a valid target, so a code can be pre-created for a
  // route before it's even launched. road_trip_any covers current + future
  // routes without needing a code per route.
  const admin = createAdminClient()
  const { data: routes } = await admin.from('upcoming_routes').select('slug')
  const VALID_TYPES = [
    'membership_routes', 'membership_inner_circle', 'road_trip_any',
    ...(routes || []).map(r => `road_trip_${r.slug}`),
  ]
  const appliesToList = Array.isArray(appliesTo) ? appliesTo.filter(t => VALID_TYPES.includes(t)) : []

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
      // Use end-of-day UTC so codes don't expire at midnight start-of-day
      expires_at: expiresAt ? Math.floor(new Date(expiresAt).getTime() / 1000) + 86399 : undefined,
      // Enforced at redemption time by apply-promo's minimum_amount check
      ...(minAmt ? { restrictions: { minimum_amount: Math.round(minAmt * 100), minimum_amount_currency: 'cad' } } : {}),
      metadata: appliesToList.length ? { applies_to: appliesToList.join(',') } : {},
    }, { expand: ['coupon'] })

    await logAdminAction(admin, adminUser?.email, {
      action: 'promo.create', entityType: 'promo_code', entityName: code.trim().toUpperCase(),
      metadata: { percentOff: percentOff || null, amountOff: amountOff || null, appliesTo: appliesToList.join(',') || 'all' },
    })
    return Response.json(promoCode)
  } catch (err) {
    captureException(err, { context: 'admin-promo-codes-create' })
    return Response.json({ error: err.message || 'Failed to create promo code.' }, { status: 500 })
  }
}
