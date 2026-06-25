import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { stripe } from '../../../../../../lib/stripe.js'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry.js'

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  const { id } = await params
  const supabase = createAdminClient()

  const { data: app } = await supabase
    .from('applications')
    .select('stripe_payment_intent_id, stripe_payment_status')
    .eq('id', id)
    .single()

  if (!app) return Response.json({ error: 'Not found.' }, { status: 404 })
  if (!app.stripe_payment_intent_id) return Response.json({ error: 'No payment on record.' }, { status: 400 })
  if (app.stripe_payment_status === 'refunded') return Response.json({ error: 'Already refunded.' }, { status: 400 })
  if (app.stripe_payment_status !== 'paid') return Response.json({ error: 'Payment is not refundable.' }, { status: 400 })

  try {
    const refund = await stripe.refunds.create({ payment_intent: app.stripe_payment_intent_id })
    // Conditional update guards against duplicate refunds — only updates if still 'paid'
    const { count } = await supabase.from('applications')
      .update({ stripe_payment_status: 'refunded', stripe_amount_refunded: refund.amount }, { count: 'exact' })
      .eq('id', id)
      .eq('stripe_payment_status', 'paid')
    if (!count) captureException(new Error('Refund double-fire: row was no longer paid'), { context: 'admin-refund', appId: id })
    return Response.json({ refund_id: refund.id })
  } catch (err) {
    captureException(err, { context: 'admin-refund', appId: id })
    return Response.json({ error: err.message || 'Refund failed.' }, { status: 500 })
  }
}
