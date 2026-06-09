import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { stripe } from '../../../../../../lib/stripe.js'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry.js'

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  const { piId } = await params

  try {
    const refund = await stripe.refunds.create({ payment_intent: piId })

    // Best-effort DB sync — ignore errors
    const supabase = createAdminClient()
    await supabase
      .from('applications')
      .update({ stripe_payment_status: 'refunded' })
      .eq('stripe_payment_intent_id', piId)
      .catch(() => {})

    return Response.json({ refund_id: refund.id })
  } catch (err) {
    captureException(err, { context: 'admin-stripe-refund', piId })
    return Response.json({ error: err.message || 'Refund failed.' }, { status: 500 })
  }
}
