import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { stripe } from '../../../../../../lib/stripe.js'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry.js'
import { computeTax } from '../../../../../../lib/tax.js'
import { PRICES, MEMBERSHIP_TYPE_TIER } from '../../../../../../lib/prices.js'
import { buildReceiptHtml } from '../../../../../../lib/receiptEmail.js'

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })
  if (!process.env.RESEND_API_KEY) return Response.json({ error: 'Email not configured.' }, { status: 503 })

  const { piId } = await params
  const { email } = await request.json()

  if (!email || !email.includes('@')) {
    return Response.json({ error: 'Valid email required.' }, { status: 400 })
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(piId)
    const supabase = createAdminClient()

    // Prefer the stored breakdown (exact figures at the time of payment); fall
    // back to recomputing from PI metadata for payments made before the ledger
    // existed, or PRICES as a last resort if metadata is missing too.
    const { data: ledger } = await supabase.from('payment_receipts')
      .select('subtotal_amount, gst_amount, qst_amount, discount_amount, total_amount, payment_type, paid_at')
      .eq('stripe_payment_intent_id', piId)
      .maybeSingle()

    let subtotal, discount, gst, qst, total, paidAt
    if (ledger) {
      ({ subtotal_amount: subtotal, discount_amount: discount, gst_amount: gst, qst_amount: qst, total_amount: total, paid_at: paidAt } = ledger)
    } else {
      const type = pi.metadata?.type
      const baseSubtotal = pi.metadata?.original_amount ? parseInt(pi.metadata.original_amount, 10) : (PRICES[type] || 0)
      discount = parseInt(pi.metadata?.discount_amount || '0', 10) || 0
      const tax = computeTax(Math.max(0, baseSubtotal - discount))
      subtotal = tax.subtotal; gst = tax.gst; qst = tax.qst; total = pi.amount_received || pi.amount
      paidAt = new Date().toISOString()
    }

    const firstName = (pi.metadata?.name || '').trim().split(' ')[0] || 'there'
    const itemLabel = ledger?.payment_type
      ? (pi.metadata?.event_name || (MEMBERSHIP_TYPE_TIER[ledger.payment_type] ? `${MEMBERSHIP_TYPE_TIER[ledger.payment_type]} Membership` : 'your Canvas Routes payment'))
      : (pi.metadata?.event_name || (MEMBERSHIP_TYPE_TIER[pi.metadata?.type] ? `${MEMBERSHIP_TYPE_TIER[pi.metadata.type]} Membership` : 'your Canvas Routes payment'))

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: email,
        subject: `Your Canvas Routes receipt — ${itemLabel}`,
        html: buildReceiptHtml({ firstName, itemLabel, subtotal, discount, gst, qst, total, paidAt, receiptId: pi.id.slice(-10) }),
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      captureException(new Error(`Resend non-200 — admin-stripe-resend-receipt: ${res.status} ${body}`), { piId })
      return Response.json({ error: 'Failed to resend.' }, { status: 502 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    captureException(err, { context: 'admin-stripe-resend-receipt', piId })
    return Response.json({ error: err.message || 'Failed to resend.' }, { status: 500 })
  }
}
