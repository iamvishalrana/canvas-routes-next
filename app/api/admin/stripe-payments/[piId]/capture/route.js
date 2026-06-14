import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { stripe } from '../../../../../../lib/stripe.js'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry.js'

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  const { piId } = await params
  if (!piId) return Response.json({ error: 'Missing payment intent ID.' }, { status: 400 })

  try {
    await stripe.paymentIntents.capture(piId, {}, { idempotencyKey: `capture-${piId}` })
  } catch (err) {
    captureException(err, { context: 'admin-capture-stripe', piId })
    return Response.json({ error: err.message || 'Capture failed.' }, { status: 500 })
  }

  // Update DB — best-effort; webhook will rescue if this fails
  const supabase = createAdminClient()
  const { error: dbErr } = await supabase.from('applications')
    .update({ stripe_payment_status: 'paid', stripe_paid_at: new Date().toISOString() })
    .eq('stripe_payment_intent_id', piId)
  if (dbErr) captureException(dbErr, { context: 'admin-capture-db', piId })

  return Response.json({ ok: true })
}
