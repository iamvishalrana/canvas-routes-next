import { after } from 'next/server'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { stripe } from '../../../../../../lib/stripe.js'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry.js'
import { logAdminAction } from '../../../../../../lib/adminAudit.js'
import { computeTax } from '../../../../../../lib/tax.js'
import { PRICES, MEMBERSHIP_TYPE_TIER } from '../../../../../../lib/prices.js'
import { buildRefundEmailHtml } from '../../../../../../lib/refundEmail.js'
import { buildRefundPdfBuffer } from '../../../../../../lib/refundPdf.js'

export async function POST(request, { params }) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  const { piId } = await params

  if (!piId || !piId.startsWith('pi_')) {
    return Response.json({ error: 'Invalid payment intent ID.' }, { status: 400 })
  }

  // Verify the PI belongs to a Canvas Routes record before issuing a refund
  const supabase = createAdminClient()
  const { data: app } = await supabase.from('applications')
    .select('id, name, email, stripe_payment_status')
    .eq('stripe_payment_intent_id', piId)
    .maybeSingle()
  if (!app) return Response.json({ error: 'Payment not found.' }, { status: 404 })
  if (app.stripe_payment_status === 'refunded') return Response.json({ error: 'Already refunded.' }, { status: 400 })
  if (app.stripe_payment_status && !['paid', 'partially_refunded', 'disputed'].includes(app.stripe_payment_status)) {
    return Response.json({ error: `Cannot refund: payment status is '${app.stripe_payment_status}'.` }, { status: 400 })
  }

  let body = {}
  try { body = await request.json() } catch {}
  const VALID_REASONS = ['requested_by_customer', 'duplicate', 'fraudulent']
  const reason = VALID_REASONS.includes(body.reason) ? body.reason : 'requested_by_customer'

  try {
    const refund = await stripe.refunds.create(
      { payment_intent: piId, reason, expand: ['payment_intent'] },
      { idempotencyKey: `refund-${piId}` }
    )
    const pi = refund.payment_intent

    // DB sync — supabase returns errors instead of throwing, so .catch() never
    // fires; check the returned error. The webhook rescue will also flip the
    // status, so report to Sentry but don't fail the refund response.
    const { error: syncErr } = await supabase
      .from('applications')
      .update({ stripe_payment_status: 'refunded', stripe_amount_refunded: refund.amount })
      .eq('stripe_payment_intent_id', piId)
    if (syncErr) captureException(new Error(syncErr.message), { context: 'admin-stripe-refund-db-sync', piId })

    await logAdminAction(supabase, admin.email, {
      action: 'payment.refund',
      entityType: 'payment_intent',
      entityId: piId,
      entityName: app.name || app.email,
      metadata: { amount: refund.amount, reason, email: app.email },
    })

    if (process.env.RESEND_API_KEY && app.email) {
      const { data: ledger } = await supabase.from('payment_receipts')
        .select('subtotal_amount, gst_amount, qst_amount, discount_amount, total_amount, paid_at')
        .eq('stripe_payment_intent_id', piId)
        .maybeSingle()

      let subtotal, discount, gst, qst, originalTotal
      if (ledger) {
        ({ subtotal_amount: subtotal, discount_amount: discount, gst_amount: gst, qst_amount: qst, total_amount: originalTotal } = ledger)
      } else {
        const type = pi?.metadata?.type
        const baseSubtotal = pi?.metadata?.original_amount ? parseInt(pi.metadata.original_amount, 10) : (PRICES[type] || 0)
        discount = parseInt(pi?.metadata?.discount_amount || '0', 10) || 0
        const tax = computeTax(Math.max(0, baseSubtotal - discount))
        subtotal = tax.subtotal; gst = tax.gst; qst = tax.qst; originalTotal = pi?.amount_received || pi?.amount || refund.amount
      }

      const firstName = (app.name || pi?.metadata?.name || '').trim().split(' ')[0] || 'there'
      const itemLabel = pi?.metadata?.event_name || (MEMBERSHIP_TYPE_TIER[pi?.metadata?.type] ? `${MEMBERSHIP_TYPE_TIER[pi.metadata.type]} Membership` : 'your Canvas Routes payment')
      const lang = pi?.metadata?.lang === 'fr' ? 'fr' : 'en'
      const receiptId = piId.slice(-10)

      const pdfBuffer = buildRefundPdfBuffer({
        firstName, billedToName: pi?.metadata?.name || app.name || null, billedToEmail: app.email,
        itemLabel, subtotal, discount, gst, qst, originalTotal,
        refundAmount: refund.amount, refundedAt: new Date().toISOString(), receiptId,
      })

      after(() =>
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Canvas Routes <info@canvasroutes.com>',
            to: app.email,
            subject: lang === 'fr' ? 'Votre remboursement Canvas Routes' : 'Your Canvas Routes refund',
            html: buildRefundEmailHtml({ lang, firstName, itemLabel, amountCents: refund.amount, currency: refund.currency }),
            attachments: [{ filename: `canvas-routes-refund-${receiptId}.pdf`, content: pdfBuffer.toString('base64') }],
          }),
        }).then(res => {
          if (!res.ok) return res.text().then(txt => { throw new Error(`Resend non-200: ${res.status} ${txt}`) })
        }).catch(err => captureException(err, { context: 'admin-stripe-refund-email', piId }))
      )
    }

    return Response.json({ refund_id: refund.id })
  } catch (err) {
    captureException(err, { context: 'admin-stripe-refund', piId })
    return Response.json({ error: err.message || 'Refund failed.' }, { status: 500 })
  }
}
