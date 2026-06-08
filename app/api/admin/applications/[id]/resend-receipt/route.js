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
    .select('stripe_payment_intent_id, email')
    .eq('id', id)
    .single()

  if (!app?.stripe_payment_intent_id) return Response.json({ error: 'No payment on record.' }, { status: 400 })

  try {
    const pi = await stripe.paymentIntents.retrieve(app.stripe_payment_intent_id, {
      expand: ['latest_charge'],
    })
    if (!pi.latest_charge) return Response.json({ error: 'No charge found.' }, { status: 400 })
    const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge.id
    // Updating receipt_email triggers Stripe to resend the receipt
    await stripe.charges.update(chargeId, { receipt_email: app.email })
    return Response.json({ ok: true })
  } catch (err) {
    captureException(err, { context: 'admin-resend-receipt', appId: id })
    return Response.json({ error: err.message || 'Failed to resend.' }, { status: 500 })
  }
}
