import { after } from 'next/server'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { stripe } from '../../../../../../lib/stripe.js'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry.js'
import { computeTax } from '../../../../../../lib/tax.js'
import { PRICES, MEMBERSHIP_TYPE_TIER } from '../../../../../../lib/prices.js'
import { buildRefundEmailHtml } from '../../../../../../lib/refundEmail.js'
import { buildRefundPdfBuffer } from '../../../../../../lib/refundPdf.js'

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

  const wasCaptured = app.stripe_payment_status === 'paid'
  let refund = null

  try {
    if (!wasCaptured) {
      // Cancel the hold — no charge to the customer
      await stripe.paymentIntents.cancel(
        app.stripe_payment_intent_id,
        {},
        { idempotencyKey: `reject-cancel-${app.stripe_payment_intent_id}` }
      )
    } else {
      // Already captured — issue a full refund. Same customer notification as
      // the dedicated refund routes — this is still money leaving their card,
      // just triggered from the reject button instead of the refund button.
      refund = await stripe.refunds.create(
        { payment_intent: app.stripe_payment_intent_id, expand: ['payment_intent'] },
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

    if (wasCaptured && process.env.RESEND_API_KEY && app.email) {
      const piId = app.stripe_payment_intent_id
      const pi = refund.payment_intent
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
        }).catch(err => captureException(err, { context: 'admin-reject-refund-email', appId: id }))
      )
    }

    return Response.json({ ok: true })
  } catch (err) {
    captureException(err, { context: 'admin-reject', appId: id })
    return Response.json({ error: err.message || 'Rejection failed.' }, { status: 500 })
  }
}
