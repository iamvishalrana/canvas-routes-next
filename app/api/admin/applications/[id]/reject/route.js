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
    .select('stripe_payment_intent_id, stripe_payment_status, email, name')
    .eq('id', id)
    .single()

  if (!app) return Response.json({ error: 'Not found.' }, { status: 404 })
  if (!app.stripe_payment_intent_id) return Response.json({ error: 'No payment on record.' }, { status: 400 })
  if (app.stripe_payment_status === 'rejected') return Response.json({ error: 'Already rejected.' }, { status: 400 })
  if (!['authorized', 'paid'].includes(app.stripe_payment_status)) {
    return Response.json({ error: 'Payment is not in a rejectable state.' }, { status: 400 })
  }

  try {
    if (app.stripe_payment_status === 'authorized') {
      // Cancel the hold — no charge to the customer
      await stripe.paymentIntents.cancel(
        app.stripe_payment_intent_id,
        {},
        { idempotencyKey: `reject-cancel-${app.stripe_payment_intent_id}` }
      )
    } else {
      // Already captured — issue a full refund
      await stripe.refunds.create(
        { payment_intent: app.stripe_payment_intent_id },
        { idempotencyKey: `reject-refund-${app.stripe_payment_intent_id}` }
      )
    }

    // Money already moved — a failed status write here must not look like success
    const { error: updateErr } = await supabase.from('applications').update({
      stripe_payment_status: 'rejected',
    }).eq('id', id).in('stripe_payment_status', ['authorized', 'paid'])
    if (updateErr) {
      captureException(new Error(updateErr.message), { context: 'admin-reject-status-update', appId: id })
      return Response.json({ error: `Payment was ${app.stripe_payment_status === 'authorized' ? 'cancelled' : 'refunded'} on Stripe, but the status could not be updated: ${updateErr.message}` }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    captureException(err, { context: 'admin-reject', appId: id })
    return Response.json({ error: err.message || 'Rejection failed.' }, { status: 500 })
  }
}
