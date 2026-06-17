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

  try {
    await stripe.paymentIntents.cancel(piId)
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
