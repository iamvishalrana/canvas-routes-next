import { stripe } from '../../../lib/stripe.js'
import { createAdminClient } from '../../../lib/supabase/admin'
import { captureMessage } from '../../../lib/sentry.js'
import RevenueClient from './RevenueClient'
import { formatPaymentType } from '../../../lib/paymentTypeLabels'

// .list() has no metadata filter, so this fetches every PaymentIntent on the
// whole Stripe account (test charges, abandoned checkouts, everything) before
// the metadata.type filter below narrows it down — the cap has to cover that
// full account-wide volume, not just Canvas Routes' share of it, or older
// real revenue silently drops out with no error.
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
export const metadata = { title: 'Revenue' }

export default async function RevenuePage() {
  const supabase = createAdminClient()
  let rows = []
  // A Stripe API hiccup (timeout, transient 5xx, etc.) used to throw straight
  // out of this async Server Component with no catch, taking down the whole
  // page with Next's generic error boundary instead of just missing the
  // Stripe-sourced rows. Degrade instead: keep whatever's available (manual
  // payments still load below) and tell the client so it can show a banner.
  let stripeError = false
  let receiptsByPi = {}
  let promoByPi = {}
  // Authorized-but-not-yet-captured holds (capture_method: 'manual') — money
  // that's committed but not yet realized. Kept entirely separate from
  // `rows`/revenue totals below; surfaced read-only in its own section.
  let pendingRows = []

  // The manual (e-transfer) payments query doesn't depend on Stripe at all, so
  // kick it off NOW and let it run concurrently with the (much slower)
  // account-wide PaymentIntent scan below instead of serializing after it.
  const manualAppsPromise = supabase
    .from('applications')
    .select('name, email, phone, stripe_amount_paid, stripe_payment_type, stripe_paid_at, stripe_payment_intent_id')
    .eq('stripe_payment_status', 'paid')
    .not('stripe_amount_paid', 'is', null)
    .then(r => r.data || [])
    .catch(() => [])

  if (stripe) {
    try {
      const allPIs = await stripe.paymentIntents.list({ expand: ['data.latest_charge'] }).autoPagingToArray({ limit: PI_FETCH_LIMIT })
      if (allPIs.length >= PI_FETCH_LIMIT) {
        captureMessage('Revenue page hit its PaymentIntent fetch cap — totals may be missing older payments', { context: 'admin-revenue-list', limit: PI_FETCH_LIMIT })
      }
      const succeeded = allPIs.filter(pi => pi.metadata?.type && pi.status === 'succeeded')
      const piIds = succeeded.map(pi => pi.id)

      // These three lookups all key off the same PI id set, so run them in one
      // parallel batch rather than three sequential round-trips. Each is
      // independently resilient (a DB hiccup on any one must not drop the
      // Stripe rows), so failures fall back to empty instead of rejecting.
      //  - disputed_lost: disputes are only recorded by the Stripe webhook
      //    (charge.dispute.* handlers), the sole source of truth for a lost
      //    dispute — Stripe's charge object never sets amount_refunded for one,
      //    so without this a charged-back payment keeps counting as revenue.
      //    Matched by stripe_payment_intent_id, NOT email (applications is one
      //    row per email; matching by email would zero out an unrelated payment
      //    for the same person or miss it if a later payment overwrote the row).
      //  - payment_receipts / promo_redemptions: tax split + human promo code,
      //    only present for payments made after the ledger shipped.
      const empty = { data: [] }
      const [disputedRes, receiptsRes, promoRes] = piIds.length > 0
        ? await Promise.all([
            supabase.from('applications').select('stripe_payment_intent_id').in('stripe_payment_intent_id', piIds).eq('stripe_payment_status', 'disputed_lost').then(r => r, () => empty),
            supabase.from('payment_receipts').select('stripe_payment_intent_id, subtotal_amount, gst_amount, qst_amount, discount_amount').in('stripe_payment_intent_id', piIds).then(r => r, () => empty),
            supabase.from('promo_redemptions').select('stripe_payment_intent_id, code, discount_amount').in('stripe_payment_intent_id', piIds).then(r => r, () => empty),
          ])
        : [empty, empty, empty]
      const disputedLostPiIds = new Set((disputedRes.data || []).map(a => a.stripe_payment_intent_id))
      for (const r of (receiptsRes.data || [])) receiptsByPi[r.stripe_payment_intent_id] = r
      for (const r of (promoRes.data || [])) promoByPi[r.stripe_payment_intent_id] = r

      rows = succeeded
        .map(pi => {
          const charge = pi.latest_charge
          const email = pi.metadata.email?.toLowerCase().trim() || ''
          const amountRefunded = disputedLostPiIds.has(pi.id)
            ? pi.amount_received
            : ((charge && typeof charge === 'object') ? (charge.amount_refunded || 0) : 0)
          return {
            id:                     pi.id,
            manual:                 false,
            name:                   pi.metadata.name || '—',
            email,
            phone:                  pi.metadata.phone || '',
            stripe_amount_paid:     pi.amount_received,
            stripe_amount_refunded: amountRefunded,
            stripe_paid_at:         (charge && typeof charge === 'object' && charge.created)
              ? new Date(charge.created * 1000).toISOString()
              : new Date(pi.created * 1000).toISOString(),
            stripe_payment_type:    pi.metadata.type || '',
            is_member:              pi.metadata.is_member || '',
          }
        })
        .sort((a, b) => new Date(b.stripe_paid_at) - new Date(a.stripe_paid_at))

      // Authorization holds still awaiting a manual capture (see rule 10 in
      // CLAUDE.md — this must never be folded into `rows`/revenue, since the
      // money hasn't actually moved). `capture_before` on the charge is
      // Stripe's authoritative expiry for the hold; falls back to a 7-day
      // estimate from authorization (the default validity window for most
      // card networks) when the charge hasn't been expanded/isn't present.
      pendingRows = allPIs
        .filter(pi => pi.metadata?.type && pi.status === 'requires_capture')
        .map(pi => {
          const charge = pi.latest_charge
          const captureBeforeTs = (charge && typeof charge === 'object')
            ? charge.payment_method_details?.card?.capture_before
            : null
          return {
            id:            pi.id,
            name:          pi.metadata.name || '—',
            email:         pi.metadata.email?.toLowerCase().trim() || '',
            phone:         pi.metadata.phone || '',
            amount:        pi.amount / 100,
            typeKey:       pi.metadata.type || '',
            type:          formatPaymentType(pi.metadata.type),
            isMember:      pi.metadata.is_member === 'yes' ? true : pi.metadata.is_member === 'no' ? false : null,
            createdAt:     new Date(pi.created * 1000).toISOString(),
            expiresAt:     new Date((captureBeforeTs || (pi.created + 7 * 86400)) * 1000).toISOString(),
            expiryIsExact: !!captureBeforeTs,
          }
        })
        .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt))
    } catch (err) {
      console.error('Revenue page Stripe fetch failed:', err.message)
      stripeError = true
    }
  }

  // Also include manual (e-transfer) payments from DB (the query above already
  // started running while Stripe was being fetched). Dedupe against the
  // Stripe-sourced rows by payment_intent_id, NOT email — matching by email
  // alone silently dropped a genuine manual payment for anyone who ALSO has any
  // unrelated Stripe payment (e.g. a membership paid by card, and a separate
  // route paid by e-transfer), undercounting real revenue against what Stripe's
  // own dashboard shows for the Stripe-only side.
  try {
    const manualApps = await manualAppsPromise
    const stripePiIds = new Set(rows.map(r => r.id).filter(Boolean))
    for (const a of manualApps) {
      const email = a.email?.toLowerCase().trim()
      if (!email) continue
      if (a.stripe_payment_intent_id && stripePiIds.has(a.stripe_payment_intent_id)) continue
      rows.push({
        id: null,
        manual: true,
        name:                   a.name || '—',
        email,
        phone:                  a.phone || '',
        stripe_amount_paid:     a.stripe_amount_paid,
        stripe_amount_refunded: 0,
        stripe_paid_at:         a.stripe_paid_at,
        stripe_payment_type:    a.stripe_payment_type || '',
        is_member:              '',
      })
    }
    rows.sort((a, b) => new Date(b.stripe_paid_at || 0) - new Date(a.stripe_paid_at || 0))
  } catch {}

  // Stats (total/by-type/by-month/recent) are all derived client-side from
  // `payments` in RevenueClient instead of here — that's what lets the page
  // offer a date-range filter that recomputes everything instantly instead
  // of round-tripping to the server on every range change.
  const toPaymentRow = r => {
    const receipt = r.id ? receiptsByPi[r.id] : null
    const promo = r.id ? promoByPi[r.id] : null
    return {
      id:        r.id || null,
      manual:    !!r.manual,
      name:      r.name,
      email:     r.email,
      phone:     r.phone || '',
      amount:    ((r.stripe_amount_paid || 0) - (r.stripe_amount_refunded || 0)) / 100,
      gross:     (r.stripe_amount_paid || 0) / 100,
      refunded:  (r.stripe_amount_refunded || 0) / 100,
      typeKey:   r.stripe_payment_type || '',
      type:      formatPaymentType(r.stripe_payment_type),
      date:      r.stripe_paid_at,
      // 'yes' → member, 'no' → non-member, '' → unknown (manual/older payments)
      isMember:  r.is_member === 'yes' ? true : r.is_member === 'no' ? false : null,
      taxSubtotal: receipt?.subtotal_amount != null ? receipt.subtotal_amount / 100 : null,
      taxGst:      receipt?.gst_amount != null ? receipt.gst_amount / 100 : null,
      taxQst:      receipt?.qst_amount != null ? receipt.qst_amount / 100 : null,
      taxDiscount: receipt?.discount_amount ? receipt.discount_amount / 100 : null,
      // Coupon: prefer the human code from promo_redemptions; fall back to a
      // flag when only the receipt discount survives (older/edge redemptions).
      promoCode:   promo?.code || null,
      hasCoupon:   !!(promo?.code) || !!(receipt?.discount_amount),
    }
  }
  return <RevenueClient payments={rows.map(toPaymentRow)} pendingPayments={pendingRows} stripeError={stripeError} />
}
