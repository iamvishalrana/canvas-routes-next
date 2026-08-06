import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { stripe } from '../../../../../../lib/stripe.js'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry.js'

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  const { piId } = await params
  if (!piId || !piId.startsWith('pi_')) return Response.json({ error: 'Invalid payment intent ID.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: app } = await supabase.from('applications')
    .select('id, stripe_payment_status')
    .eq('stripe_payment_intent_id', piId)
    .maybeSingle()
  if (!app) return Response.json({ error: 'Payment not found.' }, { status: 404 })
  if (app.stripe_payment_status === 'rejected') return Response.json({ error: 'Already cancelled.' }, { status: 400 })
  if (app.stripe_payment_status === 'paid') return Response.json({ error: 'Payment has already been captured — use refund instead.' }, { status: 400 })
  if (app.stripe_payment_status === 'refunded') return Response.json({ error: 'Payment has already been refunded.' }, { status: 400 })

  // Authoritative Stripe-side status check — the DB status is only a proxy
  // and can be stale (e.g. a payment_intent.succeeded webhook capturing the
  // hold via a different path can land before the DB sync does). Checking
  // this before calling cancel gives a clean, specific error instead of
  // Stripe's own rejection message, matching the capture route's pattern.
  let pi
  try {
    pi = await stripe.paymentIntents.retrieve(piId)
  } catch (err) {
    captureException(err, { context: 'admin-cancel-pi-retrieve', piId })
    return Response.json({ error: 'Could not verify payment.' }, { status: 500 })
  }
  if (pi.status === 'succeeded') return Response.json({ error: 'Payment has already been captured — use refund instead.' }, { status: 400 })
  if (pi.status === 'canceled') return Response.json({ error: 'Already cancelled.' }, { status: 400 })
  if (!['requires_payment_method', 'requires_confirmation', 'requires_action', 'requires_capture'].includes(pi.status)) {
    return Response.json({ error: `Payment cannot be cancelled (Stripe status: ${pi.status}).` }, { status: 400 })
  }

  try {
    await stripe.paymentIntents.cancel(piId, {}, { idempotencyKey: `cancel-${piId}` })
  } catch (err) {
    captureException(err, { context: 'admin-cancel-stripe', piId })
    return Response.json({ error: err.message || 'Cancel failed.' }, { status: 500 })
  }

  // Update DB — best-effort; webhook will rescue if this fails
  const { error: dbErr } = await supabase.from('applications')
    .update({ stripe_payment_status: 'rejected' })
    .eq('stripe_payment_intent_id', piId)
  if (dbErr) captureException(dbErr, { context: 'admin-cancel-db', piId })

  return Response.json({ ok: true })
}
