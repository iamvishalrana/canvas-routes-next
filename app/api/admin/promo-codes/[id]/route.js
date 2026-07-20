import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../../lib/adminAudit.js'
import { stripe } from '../../../../../lib/stripe.js'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { captureException } from '../../../../../lib/sentry.js'

export async function PATCH(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  const { id } = await params
  let body = {}
  try { body = await request.json() } catch {}

  // Edit: Stripe doesn't allow updating max_redemptions or expires_at in-place,
  // so we deactivate the old code and recreate it with the same code string.
  if (body.action === 'edit') {
    try {
      const existing = await stripe.promotionCodes.retrieve(id, { expand: ['coupon'] })
      // Guard: new max_redemptions must not be below times already redeemed.
      // Stripe's own times_redeemed never increments in this integration —
      // use the real count from promo_redemptions instead.
      if (body.maxRedemptions) {
        const { count: timesRedeemed } = await createAdminClient().from('promo_redemptions')
          .select('id', { count: 'exact', head: true }).eq('promo_code_id', id)
        const newMax = parseInt(body.maxRedemptions, 10)
        if (newMax < (timesRedeemed ?? 0)) {
          return Response.json({
            error: `Max uses cannot be less than the ${timesRedeemed} time${timesRedeemed !== 1 ? 's' : ''} this code has already been redeemed.`,
          }, { status: 400 })
        }
      }
      // Deactivate the old code FIRST — Stripe enforces `code` uniqueness among
      // currently-active codes, so creating the new one (same code string)
      // while the old one is still active would be rejected. If creation then
      // fails, reactivate the old code so nothing is lost.
      await stripe.promotionCodes.update(id, { active: false })
      let newCode
      try {
        newCode = await stripe.promotionCodes.create({
          coupon: existing.coupon.id,
          code: existing.code,
          ...(body.maxRedemptions ? { max_redemptions: parseInt(body.maxRedemptions, 10) } : {}),
          // Use end-of-day UTC so codes don't expire at midnight start-of-day
          ...(body.expiresAt ? { expires_at: Math.floor(new Date(body.expiresAt).getTime() / 1000) + 86399 } : {}),
          // Preserve the minimum-purchase restriction — without this, editing
          // max uses or expiry silently strips it from the recreated code
          ...(existing.restrictions?.minimum_amount ? {
            restrictions: {
              minimum_amount: existing.restrictions.minimum_amount,
              minimum_amount_currency: existing.restrictions.minimum_amount_currency || 'cad',
            },
          } : {}),
          // Preserve applies_to and any other metadata from the original code
          metadata: existing.metadata || {},
        }, { expand: ['coupon'] })
      } catch (createErr) {
        await stripe.promotionCodes.update(id, { active: true }).catch(() => {})
        throw createErr
      }
      await logAdminAction(createAdminClient(), adminUser?.email, { action: 'promo.edit', entityType: 'promo_code', entityId: id, entityName: existing.code })
      return Response.json({ oldId: id, newCode })
    } catch (err) {
      captureException(err, { context: 'promo-code-edit', id })
      return Response.json({ error: err.message || 'Failed to update code.' }, { status: 500 })
    }
  }

  // Reactivate
  if (body.action === 'reactivate') {
    try {
      const updated = await stripe.promotionCodes.update(id, { active: true })
      await logAdminAction(createAdminClient(), adminUser?.email, { action: 'promo.reactivate', entityType: 'promo_code', entityId: id, entityName: updated.code })
      return Response.json(updated)
    } catch (err) {
      captureException(err, { context: 'promo-code-reactivate', id })
      return Response.json({ error: err.message || 'Failed to reactivate.' }, { status: 500 })
    }
  }

  // Default: deactivate
  try {
    const updated = await stripe.promotionCodes.update(id, { active: false })
    await logAdminAction(createAdminClient(), adminUser?.email, { action: 'promo.deactivate', entityType: 'promo_code', entityId: id, entityName: updated.code })
    return Response.json(updated)
  } catch (err) {
    captureException(err, { context: 'promo-code-deactivate', id })
    return Response.json({ error: err.message || 'Failed to deactivate.' }, { status: 500 })
  }
}
