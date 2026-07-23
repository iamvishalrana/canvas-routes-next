import { after } from 'next/server'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { stripe } from '../../../../../../lib/stripe.js'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry.js'
import { logAdminAction } from '../../../../../../lib/adminAudit.js'
import { MEMBERSHIP_TYPE_TIER } from '../../../../../../lib/prices.js'
import { buildRefundEmailHtml } from '../../../../../../lib/refundEmail.js'

export async function POST(request, { params }) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  const { id } = await params
  const supabase = createAdminClient()

  const { data: app } = await supabase
    .from('applications')
    .select('name, email, stripe_payment_intent_id, stripe_payment_status')
    .eq('id', id)
    .single()

  if (!app) return Response.json({ error: 'Not found.' }, { status: 404 })
  if (!app.stripe_payment_intent_id) return Response.json({ error: 'No payment on record.' }, { status: 400 })
  if (app.stripe_payment_status === 'refunded') return Response.json({ error: 'Already refunded.' }, { status: 400 })
  if (app.stripe_payment_status !== 'paid') return Response.json({ error: 'Payment is not refundable.' }, { status: 400 })

  try {
    const refund = await stripe.refunds.create(
      { payment_intent: app.stripe_payment_intent_id, expand: ['payment_intent'] },
      { idempotencyKey: `refund-app-${app.stripe_payment_intent_id}` }
    )
    const pi = refund.payment_intent
    // Conditional update guards against duplicate refunds — only updates if still 'paid'
    const { count } = await supabase.from('applications')
      .update({ stripe_payment_status: 'refunded', stripe_amount_refunded: refund.amount }, { count: 'exact' })
      .eq('id', id)
      .eq('stripe_payment_status', 'paid')
    if (!count) captureException(new Error('Refund double-fire: row was no longer paid'), { context: 'admin-refund', appId: id })

    await logAdminAction(supabase, admin.email, {
      action: 'payment.refund',
      entityType: 'application',
      entityId: id,
      entityName: app.name || app.email,
      metadata: { amount: refund.amount, email: app.email },
    })

    if (process.env.RESEND_API_KEY && app.email) {
      const firstName = (app.name || pi?.metadata?.name || '').trim().split(' ')[0] || 'there'
      const itemLabel = pi?.metadata?.event_name || (MEMBERSHIP_TYPE_TIER[pi?.metadata?.type] ? `${MEMBERSHIP_TYPE_TIER[pi.metadata.type]} Membership` : 'your Canvas Routes payment')
      const lang = pi?.metadata?.lang === 'fr' ? 'fr' : 'en'
      after(() =>
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Canvas Routes <info@canvasroutes.com>',
            to: app.email,
            subject: lang === 'fr' ? 'Votre remboursement Canvas Routes' : 'Your Canvas Routes refund',
            html: buildRefundEmailHtml({ lang, firstName, itemLabel, amountCents: refund.amount, currency: refund.currency }),
          }),
        }).then(res => {
          if (!res.ok) return res.text().then(body => { throw new Error(`Resend non-200: ${res.status} ${body}`) })
        }).catch(err => captureException(err, { context: 'admin-refund-email', appId: id }))
      )
    }

    return Response.json({ refund_id: refund.id })
  } catch (err) {
    captureException(err, { context: 'admin-refund', appId: id })
    return Response.json({ error: err.message || 'Refund failed.' }, { status: 500 })
  }
}
