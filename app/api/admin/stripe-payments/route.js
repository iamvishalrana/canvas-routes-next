import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { stripe } from '../../../../lib/stripe.js'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureException, captureMessage } from '../../../../lib/sentry.js'

// .list() has no metadata filter, so this fetches every PaymentIntent on the
// whole Stripe account (test charges, abandoned checkouts, everything) before
// the metadata.type filter below narrows it down — the cap has to cover that
// full account-wide volume, not just Canvas Routes' share of it, or older
// real payments silently drop out with no error.
const PI_FETCH_LIMIT = 10000

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  const supabase = createAdminClient()

  let allPIs
  try {
    allPIs = await stripe.paymentIntents.list({ expand: ['data.latest_charge'] }).autoPagingToArray({ limit: PI_FETCH_LIMIT })
    if (allPIs.length >= PI_FETCH_LIMIT) {
      captureMessage('Stripe payments admin route hit its PaymentIntent fetch cap — results may be missing older payments', { context: 'admin-stripe-payments-list', limit: PI_FETCH_LIMIT })
    }
  } catch (err) {
    captureException(err, { context: 'admin-stripe-payments-list' })
    return Response.json({ error: 'Could not fetch payments from Stripe.' }, { status: 502 })
  }

  // Filter to Canvas Routes payments only
  const canvasPIs = allPIs.filter(pi => pi.metadata?.type)

  // Collect unique emails for bulk Supabase lookup
  const emails = [...new Set(
    canvasPIs
      .map(pi => pi.metadata.email?.toLowerCase().trim())
      .filter(Boolean)
  )]

  let appsByEmail = {}
  if (emails.length > 0) {
    const { data: apps } = await supabase
      .from('applications')
      .select('id, email, stripe_payment_status')
      .in('email', emails)
    if (apps) {
      for (const app of apps) {
        appsByEmail[app.email.toLowerCase().trim()] = app
      }
    }
  }

  // Tax breakdown, keyed by PI id — only present for payments made after the
  // ledger shipped; older payments simply show no breakdown.
  const piIds = canvasPIs.map(pi => pi.id)
  let receiptsByPi = {}
  if (piIds.length > 0) {
    const { data: receipts } = await supabase.from('payment_receipts')
      .select('stripe_payment_intent_id, subtotal_amount, gst_amount, qst_amount, discount_amount, total_amount')
      .in('stripe_payment_intent_id', piIds)
    if (receipts) for (const r of receipts) receiptsByPi[r.stripe_payment_intent_id] = r
  }

  // Dispute status, keyed by PI id — NOT by email like appsByEmail above.
  // applications is one row per email, so a dispute recorded against a
  // person's most recent payment would otherwise get applied to every one
  // of their PIs (wrongly flagging unrelated, undisputed payments), while a
  // dispute on an OLDER payment would be missed entirely once a later
  // payment overwrites that row's status.
  let disputeStatusByPi = {}
  if (piIds.length > 0) {
    const { data: disputes } = await supabase.from('applications')
      .select('stripe_payment_intent_id, stripe_payment_status')
      .in('stripe_payment_intent_id', piIds)
      .in('stripe_payment_status', ['disputed', 'disputed_won', 'disputed_lost'])
    if (disputes) for (const d of disputes) disputeStatusByPi[d.stripe_payment_intent_id] = d.stripe_payment_status
    // Disputes on an `event_registration`-type PI are written into
    // event_registrations instead of applications (see the webhook's
    // charge.dispute.* handlers) — without this, a lost dispute on an event
    // payment never surfaces here, on this route's own realtime-refresh path.
    const { data: eventRegDisputes } = await supabase.from('event_registrations')
      .select('stripe_payment_intent_id, stripe_payment_status')
      .in('stripe_payment_intent_id', piIds)
      .in('stripe_payment_status', ['disputed', 'disputed_won', 'disputed_lost'])
    if (eventRegDisputes) for (const d of eventRegDisputes) disputeStatusByPi[d.stripe_payment_intent_id] = d.stripe_payment_status
  }

  const records = canvasPIs.map(pi => {
    const email = pi.metadata.email?.toLowerCase().trim() || ''
    const app = appsByEmail[email] || null
    const receipt = receiptsByPi[pi.id] || null
    const disputeStatus = disputeStatusByPi[pi.id] || null

    // Determine normalized status and refund amount
    let stripe_payment_status
    const charge = pi.latest_charge
    const amountRefunded = (charge && typeof charge === 'object') ? (charge.amount_refunded || 0) : 0
    const fullyRefunded  = (charge && typeof charge === 'object') ? charge.refunded : false

    // Disputes are only ever recorded by the Stripe webhook (charge.dispute.*
    // handlers in app/api/stripe/webhook/route.js), which is the sole source
    // of truth for disputed/disputed_won/disputed_lost — Stripe's PaymentIntent
    // itself doesn't change status for a dispute, so re-deriving status from
    // pi/charge alone (as this route did before) always showed "paid" for a
    // disputed charge even after it was lost, silently disagreeing with both
    // the DB and Stripe's own dashboard.
    if (disputeStatus) {
      stripe_payment_status = disputeStatus
    } else if (fullyRefunded) {
      stripe_payment_status = 'refunded'
    } else if (amountRefunded > 0) {
      stripe_payment_status = 'partially_refunded'
    } else if (pi.status === 'succeeded') {
      stripe_payment_status = 'paid'
    } else if (pi.status === 'requires_capture') {
      stripe_payment_status = 'authorized'
    } else if (pi.status === 'canceled') {
      stripe_payment_status = 'rejected'
    } else if (pi.status === 'requires_payment_method') {
      stripe_payment_status = 'failed'
    } else {
      stripe_payment_status = pi.status
    }

    const card = (charge && typeof charge === 'object') ? charge.payment_method_details?.card : null
    // Matches app/admin/payments/page.jsx's SSR formula exactly — amount_received
    // is only meaningful once a PI has actually succeeded; for anything else
    // (authorized hold, canceled, failed) it's 0, so pi.amount (the real
    // attempted/held amount) is what should display. Using requires_capture
    // as the sole "not succeeded" branch (as this route did before) meant a
    // canceled/failed PI rendered its amount as 0 on this route's own
    // realtime-refresh path even though the initial SSR load showed the
    // correct figure — the dollar amount would visibly disappear on refresh.
    const stripeAmountPaid = pi.status === 'succeeded' ? pi.amount_received : pi.amount
    // A lost dispute withdraws the funds just like a refund would, but
    // Stripe's charge object never sets amount_refunded/refunded for a
    // dispute (that's a separate mechanism) — without this, a charged-back
    // payment kept showing its full amount as still "collected".
    const effectiveRefunded = stripe_payment_status === 'disputed_lost' ? stripeAmountPaid : amountRefunded

    return {
      id: app?.id || null,
      stripe_payment_intent_id: pi.id,
      name: pi.metadata.name || '',
      email,
      stripe_amount_paid: stripeAmountPaid,
      stripe_amount_refunded: effectiveRefunded,
      stripe_payment_status,
      stripe_payment_type: pi.metadata.type || '',
      // Use actual charge timestamp when available; fall back to PI creation time
      stripe_paid_at: (charge && typeof charge === 'object' && charge.created)
        ? new Date(charge.created * 1000).toISOString()
        : new Date(pi.created * 1000).toISOString(),
      // Extras for the expandable detail view (admin-only route)
      card_brand:  card?.brand  || null,
      card_last4:  card?.last4  || null,
      wallet:      card?.wallet?.type || null, // apple_pay / google_pay
      receipt_url: (charge && typeof charge === 'object') ? (charge.receipt_url || null) : null,
      metadata:    pi.metadata || {},
      tax_subtotal: receipt?.subtotal_amount ?? null,
      tax_gst:      receipt?.gst_amount ?? null,
      tax_qst:      receipt?.qst_amount ?? null,
      tax_discount: receipt?.discount_amount ?? null,
    }
  })

  // Also pull manual (non-Stripe) payments from DB — e-transfers, cash, etc.
  // Dedupe against the Stripe-sourced records above by payment_intent_id, NOT
  // email — matching by email alone silently dropped a genuine manual
  // payment for anyone who ALSO has any unrelated Stripe payment (e.g. a
  // membership paid by card, and a separate route paid by e-transfer).
  const stripePiIds = new Set(records.map(r => r.stripe_payment_intent_id).filter(Boolean))
  const { data: manualApps, error: manualErr } = await supabase
    .from('applications')
    .select('id, name, email, stripe_payment_status, stripe_amount_paid, stripe_payment_type, stripe_paid_at, stripe_payment_intent_id')
    .not('stripe_payment_status', 'is', null)
    .not('stripe_amount_paid', 'is', null)
  if (!manualErr) {
    for (const a of (manualApps || [])) {
      const email = a.email?.toLowerCase().trim()
      if (!email) continue
      if (a.stripe_payment_intent_id && stripePiIds.has(a.stripe_payment_intent_id)) continue
      records.push({
        id:                       a.id,
        stripe_payment_intent_id: a.stripe_payment_intent_id || null,
        name:                     a.name || '',
        email,
        stripe_amount_paid:       a.stripe_amount_paid,
        stripe_amount_refunded:   0,
        stripe_payment_status:    a.stripe_payment_status,
        stripe_payment_type:      a.stripe_payment_type || '',
        stripe_paid_at:           a.stripe_paid_at,
        manual:                   true,
      })
    }
  }

  records.sort((a, b) => new Date(b.stripe_paid_at) - new Date(a.stripe_paid_at))

  return Response.json(records)
}
