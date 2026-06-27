import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { stripe } from '../../../../../lib/stripe.js'
import { captureException } from '../../../../../lib/sentry.js'

export async function PATCH(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  const { id } = await params
  let body = {}
  try { body = await request.json() } catch {}

  // Edit: Stripe doesn't allow updating max_redemptions or expires_at in-place,
  // so we deactivate the old code and recreate it with the same code string.
  if (body.action === 'edit') {
    try {
      const existing = await stripe.promotionCodes.retrieve(id, { expand: ['coupon'] })
      // Create the new code FIRST — if this fails the old code is still active (no data loss)
      const newCode = await stripe.promotionCodes.create({
        coupon: existing.coupon.id,
        code: existing.code,
        ...(body.maxRedemptions ? { max_redemptions: parseInt(body.maxRedemptions, 10) } : {}),
        // Use end-of-day UTC so codes don't expire at midnight start-of-day
        ...(body.expiresAt ? { expires_at: Math.floor(new Date(body.expiresAt).getTime() / 1000) + 86399 } : {}),
        // Preserve applies_to and any other metadata from the original code
        metadata: existing.metadata || {},
      }, { expand: ['coupon'] })
      // Only deactivate the old code after the new one is confirmed created
      await stripe.promotionCodes.update(id, { active: false })
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
      return Response.json(updated)
    } catch (err) {
      captureException(err, { context: 'promo-code-reactivate', id })
      return Response.json({ error: err.message || 'Failed to reactivate.' }, { status: 500 })
    }
  }

  // Default: deactivate
  try {
    const updated = await stripe.promotionCodes.update(id, { active: false })
    return Response.json(updated)
  } catch (err) {
    captureException(err, { context: 'promo-code-deactivate', id })
    return Response.json({ error: err.message || 'Failed to deactivate.' }, { status: 500 })
  }
}
