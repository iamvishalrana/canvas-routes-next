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
  if (app.stripe_payment_status === 'paid') return Response.json({ error: 'Already captured.' }, { status: 400 })
  if (app.stripe_payment_status !== 'authorized') return Response.json({ error: 'Payment is not in an authorized state.' }, { status: 400 })

  try {
    await stripe.paymentIntents.capture(app.stripe_payment_intent_id, {}, {
      idempotencyKey: `capture-${id}`,
    })

    const { error: dbErr } = await supabase.from('applications').update({
      stripe_payment_status: 'paid',
      stripe_paid_at: new Date().toISOString(),
    }).eq('id', id)

    if (dbErr) {
      // Stripe captured successfully — DB will be rescued by payment_intent.succeeded webhook.
      // Log but return success so the admin isn't shown a false failure.
      captureException(dbErr, { context: 'admin-capture-db-write', appId: id })
    }

    return Response.json({ ok: true })
  } catch (err) {
    captureException(err, { context: 'admin-approve-capture', appId: id })
    return Response.json({ error: err.message || 'Capture failed.' }, { status: 500 })
  }
}
