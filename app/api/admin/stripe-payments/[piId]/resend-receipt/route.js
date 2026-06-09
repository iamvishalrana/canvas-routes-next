import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { stripe } from '../../../../../../lib/stripe.js'
import { captureException } from '../../../../../../lib/sentry.js'

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  const { piId } = await params
  const { email } = await request.json()

  try {
    const pi = await stripe.paymentIntents.retrieve(piId, { expand: ['latest_charge'] })

    if (!pi.latest_charge) return Response.json({ error: 'No charge found.' }, { status: 400 })
    const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge.id

    await stripe.charges.update(chargeId, { receipt_email: email })

    return Response.json({ ok: true })
  } catch (err) {
    captureException(err, { context: 'admin-stripe-resend-receipt', piId })
    return Response.json({ error: err.message || 'Failed to resend.' }, { status: 500 })
  }
}
