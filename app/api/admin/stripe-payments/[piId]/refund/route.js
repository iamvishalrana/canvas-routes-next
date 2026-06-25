import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { stripe } from '../../../../../../lib/stripe.js'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry.js'

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  const { piId } = await params

  if (!piId || !piId.startsWith('pi_')) {
    return Response.json({ error: 'Invalid payment intent ID.' }, { status: 400 })
  }

  // Verify the PI belongs to a Canvas Routes record before issuing a refund
  const supabase = createAdminClient()
  const { data: app } = await supabase.from('applications')
    .select('id, stripe_payment_status')
    .eq('stripe_payment_intent_id', piId)
    .maybeSingle()
  if (!app) return Response.json({ error: 'Payment not found.' }, { status: 404 })
  if (app.stripe_payment_status === 'refunded') return Response.json({ error: 'Already refunded.' }, { status: 400 })

  let body = {}
  try { body = await request.json() } catch {}
  const VALID_REASONS = ['requested_by_customer', 'duplicate', 'fraudulent']
  const reason = VALID_REASONS.includes(body.reason) ? body.reason : 'requested_by_customer'

  try {
    const refund = await stripe.refunds.create(
      { payment_intent: piId, reason },
      { idempotencyKey: `refund-${piId}` }
    )

    // Best-effort DB sync — ignore errors
    await supabase
      .from('applications')
      .update({ stripe_payment_status: 'refunded', stripe_amount_refunded: refund.amount })
      .eq('stripe_payment_intent_id', piId)
      .catch(() => {})

    return Response.json({ refund_id: refund.id })
  } catch (err) {
    captureException(err, { context: 'admin-stripe-refund', piId })
    return Response.json({ error: err.message || 'Refund failed.' }, { status: 500 })
  }
}
