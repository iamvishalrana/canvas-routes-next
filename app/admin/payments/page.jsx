import { stripe } from '../../../lib/stripe.js'
import { createAdminClient } from '../../../lib/supabase/admin'
import { captureMessage } from '../../../lib/sentry.js'
import PaymentsClient from './PaymentsClient'

// .list() has no metadata filter, so this fetches every PaymentIntent on the
// whole Stripe account (test charges, abandoned checkouts, everything) before
// the metadata.type filter below narrows it down — the cap has to cover that
// full account-wide volume, not just Canvas Routes' share of it, or older
// real payments silently drop out with no error.
const PI_FETCH_LIMIT = 10000

// Auth is already enforced by middleware.js — no need to re-check here.
// Deliberately NOT cached (no revalidate/ISR) — this is a financial page, and
// a refund issued directly in the Stripe dashboard (not through this admin
// panel) must show up on the very next load. This page has low enough
// traffic that refetching Stripe on every request is the right trade-off
// over risking a stale post-refund snapshot sticking around indefinitely on
// a low-traffic route (ISR only revalidates when the next request happens to
// arrive after the window expires, which can lag well past the nominal TTL
// when admin visits are infrequent).
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Payments' }

export default async function PaymentsPage() {
  const supabase = createAdminClient()
  const records = []

  // The manual (e-transfer) payments query doesn't depend on Stripe, so start
  // it now and let it run concurrently with the slow account-wide PI scan
  // below instead of serializing after it.
  const manualAppsPromise = supabase
    .from('applications')
    .select('id, name, email, stripe_payment_status, stripe_amount_paid, stripe_payment_type, stripe_paid_at, stripe_payment_intent_id')
    .not('stripe_payment_status', 'is', null)
    .not('stripe_amount_paid', 'is', null)
    .then(r => r.data || [])
    .catch(() => [])

  // Fetch from Stripe
  if (stripe) {
    try {
      const piList = await stripe.paymentIntents.list({ expand: ['data.latest_charge'] }).autoPagingToArray({ limit: PI_FETCH_LIMIT })
      if (piList.length >= PI_FETCH_LIMIT) {
        captureMessage('Payments page hit its PaymentIntent fetch cap — results may be missing older payments', { context: 'admin-payments-list', limit: PI_FETCH_LIMIT })
      }
      const canvasPIs = piList.filter(pi => pi.metadata?.type)
      const piIds = canvasPIs.map(pi => pi.id)
      const emails = [...new Set(canvasPIs.map(pi => pi.metadata.email?.toLowerCase().trim()).filter(Boolean))]

      // These three lookups are independent, so run them in one parallel batch.
      // Each is resilient (a DB hiccup on one must not drop the Stripe rows).
      //  - disputes (by PI id, NOT email — applications is one row per email, so
      //    email matching would wrongly flag a person's other undisputed
      //    payments): Stripe's PaymentIntent never changes status for a dispute,
      //    so without this a disputed/lost charge shows as plain "paid".
      //  - payment_receipts: the tax split shown in the expandable detail.
      //  - applications by email: the row id, so the "Application →" link works.
      // Enriching these HERE (rather than only in the client GET route) is what
      // makes the detail panel, card info, tax, and app links populate on first
      // load — the client only refetches on a realtime change, never on mount.
      const empty = { data: [] }
      const [disputeRes, receiptRes, appsRes] = await Promise.all([
        piIds.length ? supabase.from('applications').select('stripe_payment_intent_id, stripe_payment_status').in('stripe_payment_intent_id', piIds).in('stripe_payment_status', ['disputed', 'disputed_won', 'disputed_lost']).then(r => r, () => empty) : Promise.resolve(empty),
        piIds.length ? supabase.from('payment_receipts').select('stripe_payment_intent_id, subtotal_amount, gst_amount, qst_amount, discount_amount').in('stripe_payment_intent_id', piIds).then(r => r, () => empty) : Promise.resolve(empty),
        emails.length ? supabase.from('applications').select('id, email').in('email', emails).then(r => r, () => empty) : Promise.resolve(empty),
      ])
      const disputeStatusByPi = {}
      for (const d of (disputeRes.data || [])) disputeStatusByPi[d.stripe_payment_intent_id] = d.stripe_payment_status
      const receiptsByPi = {}
      for (const r of (receiptRes.data || [])) receiptsByPi[r.stripe_payment_intent_id] = r
      const appIdByEmail = {}
      for (const a of (appsRes.data || [])) if (a.email) appIdByEmail[a.email.toLowerCase().trim()] = a.id

      for (const pi of canvasPIs) {
        const email = pi.metadata.email?.toLowerCase().trim() || ''
        const charge = pi.latest_charge
        const amountRefunded = (charge && typeof charge === 'object') ? (charge.amount_refunded || 0) : 0
        const fullyRefunded  = (charge && typeof charge === 'object') ? charge.refunded : false
        const disputeStatus = disputeStatusByPi[pi.id] || null
        const receipt = receiptsByPi[pi.id] || null
        const card = (charge && typeof charge === 'object') ? charge.payment_method_details?.card : null

        let stripe_payment_status
        if (disputeStatus)        stripe_payment_status = disputeStatus
        else if (fullyRefunded)        stripe_payment_status = 'refunded'
        else if (amountRefunded > 0) stripe_payment_status = 'partially_refunded'
        else if (pi.status === 'succeeded')              stripe_payment_status = 'paid'
        else if (pi.status === 'requires_capture')       stripe_payment_status = 'authorized'
        else if (pi.status === 'canceled')               stripe_payment_status = 'rejected'
        else if (['requires_payment_method','payment_failed'].includes(pi.status)) stripe_payment_status = 'failed'
        else stripe_payment_status = pi.status

        const stripeAmountPaid = pi.status === 'succeeded' ? pi.amount_received : pi.amount
        // A lost dispute withdraws the funds like a refund would, but
        // Stripe never sets amount_refunded for a dispute (separate
        // mechanism) — without this the full amount kept showing as
        // collected even after the money was taken back.
        const effectiveRefunded = stripe_payment_status === 'disputed_lost' ? stripeAmountPaid : amountRefunded

        records.push({
          id:                       appIdByEmail[email] || null,
          stripe_payment_intent_id: pi.id,
          name:                     pi.metadata.name || '',
          email,
          stripe_amount_paid:       stripeAmountPaid,
          stripe_amount_refunded:   effectiveRefunded,
          stripe_payment_status,
          stripe_payment_type:      pi.metadata.type || '',
          stripe_paid_at:           (charge && typeof charge === 'object' && charge.created)
            ? new Date(charge.created * 1000).toISOString()
            : new Date(pi.created * 1000).toISOString(),
          manual:                   false,
          // Extras for the expandable detail view (admin-only page)
          card_brand:   card?.brand || null,
          card_last4:   card?.last4 || null,
          wallet:       card?.wallet?.type || null,
          receipt_url:  (charge && typeof charge === 'object') ? (charge.receipt_url || null) : null,
          metadata:     pi.metadata || {},
          tax_subtotal: receipt?.subtotal_amount ?? null,
          tax_gst:      receipt?.gst_amount ?? null,
          tax_qst:      receipt?.qst_amount ?? null,
          tax_discount: receipt?.discount_amount ?? null,
        })
      }
    } catch (e) {
      console.error('Stripe fetch failed:', e.message)
    }
  }

  // Also fetch manual (e-transfer) payments from DB. Dedupe against the
  // Stripe-sourced records above by payment_intent_id, NOT email — matching
  // by email alone silently dropped a genuine manual payment for anyone who
  // ALSO has any unrelated Stripe payment (e.g. a membership paid by card,
  // and a separate route paid by e-transfer).
  try {
    const manualApps = await manualAppsPromise
    const stripePiIds = new Set(records.map(r => r.stripe_payment_intent_id).filter(Boolean))
    for (const a of manualApps) {
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
  } catch (e) {
    console.error('DB manual payments fetch failed:', e.message)
  }

  records.sort((a, b) => new Date(b.stripe_paid_at || 0) - new Date(a.stripe_paid_at || 0))

  return <PaymentsClient initialRecords={records} />
}
