import { after } from 'next/server'
import { computeTax } from './tax.js'
import { MEMBERSHIP_TYPE_TIER } from './prices.js'
import { buildReceiptHtml } from './receiptEmail.js'
import { captureException } from './sentry.js'

// Called once a payment has definitively succeeded — from the webhook's
// payment_intent.succeeded handler AND both admin capture routes (capture is
// itself a form of success for manual-capture flows). Idempotent: every
// write is upsert-by-PaymentIntent-id, and the receipt email is sent exactly
// once via an atomic claim on receipt_sent_at (same pattern as the existing
// waitlist_notified_pi dedup gate), so calling this from multiple call sites
// — or the same webhook event redelivered — never double-writes or
// double-emails.
export async function recordPaymentSuccess(supabase, pi) {
  const type = pi.metadata?.type
  if (!type) return

  // original_amount (pre-tax subtotal) is only present on PIs created after
  // this feature shipped — legacy in-flight PIs have nothing to reconcile.
  const subtotal = parseInt(pi.metadata?.original_amount || '0', 10)
  if (!subtotal) return

  const discount = parseInt(pi.metadata?.discount_amount || '0', 10) || 0
  const { gst, qst } = computeTax(Math.max(0, subtotal - discount))
  const total = pi.amount_received || pi.amount
  const email = pi.metadata?.email || ''
  const name = pi.metadata?.name || ''

  const { error: upsertErr } = await supabase.from('payment_receipts').upsert({
    stripe_payment_intent_id: pi.id,
    email,
    name,
    payment_type: type,
    subtotal_amount: Math.max(0, subtotal - discount),
    gst_amount: gst,
    qst_amount: qst,
    discount_amount: discount,
    total_amount: total,
    currency: pi.currency || 'cad',
    promo_code_id: pi.metadata?.promo_code_id || null,
    paid_at: new Date().toISOString(),
  }, { onConflict: 'stripe_payment_intent_id' })
  if (upsertErr) {
    captureException(upsertErr, { context: 'record-payment-success-ledger', piId: pi.id })
    return
  }

  if (pi.metadata?.promo_code_id) {
    const { error: redemptionErr } = await supabase.from('promo_redemptions').upsert({
      promo_code_id: pi.metadata.promo_code_id,
      stripe_payment_intent_id: pi.id,
      email,
      discount_amount: discount,
    }, { onConflict: 'stripe_payment_intent_id', ignoreDuplicates: true })
    if (redemptionErr) captureException(redemptionErr, { context: 'record-payment-success-redemption', piId: pi.id })
  }

  if (!email || !process.env.RESEND_API_KEY) return

  // Atomic claim — conditional UPDATE matches zero rows if another caller
  // (webhook vs. capture route, or a retried webhook delivery) already sent it.
  const { data: claimed } = await supabase.from('payment_receipts')
    .update({ receipt_sent_at: new Date().toISOString() })
    .eq('stripe_payment_intent_id', pi.id)
    .is('receipt_sent_at', null)
    .select('id')
  if (!claimed?.length) return

  const firstName = name.trim().split(' ')[0] || 'there'
  const itemLabel = pi.metadata?.event_name
    || (MEMBERSHIP_TYPE_TIER[type] ? `${MEMBERSHIP_TYPE_TIER[type]} Membership` : 'your Canvas Routes payment')

  after(() =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: email,
        subject: `Your Canvas Routes receipt — ${itemLabel}`,
        html: buildReceiptHtml({
          firstName,
          billedToName: name.trim() || null,
          billedToEmail: email || null,
          itemLabel,
          subtotal: Math.max(0, subtotal - discount),
          discount,
          gst,
          qst,
          total,
          paidAt: new Date().toISOString(),
          receiptId: pi.id.slice(-10),
        }),
      }),
    }).catch(err => captureException(err, { context: 'record-payment-success-receipt-email', piId: pi.id }))
  )
}
