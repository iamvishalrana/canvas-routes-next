import { stripe } from '../../../lib/stripe.js'
import { createAdminClient } from '../../../lib/supabase/admin'
import { captureMessage } from '../../../lib/sentry.js'
import RevenueClient from './RevenueClient'

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
export const metadata = { title: 'Revenue — Admin' }

const TYPE_LABELS = {
  membership_routes:       'Routes Member',
  membership_inner_circle: 'Inner Circle',
  road_trip_standard:      'Route (Standard)',
  road_trip_member:        'Route (Member)',
  road_trip_inner_circle:  'Route (Inner Circle)',
  road_trip_wtet:          'WTET — July 5, 2026',
  'road_trip_hello-to-montebello': 'Hello to Montebello — 2026',
  event_registration:      'Event Registration',
}

export default async function RevenuePage() {
  let rows = []
  // A Stripe API hiccup (timeout, transient 5xx, etc.) used to throw straight
  // out of this async Server Component with no catch, taking down the whole
  // page with Next's generic error boundary instead of just missing the
  // Stripe-sourced rows. Degrade instead: keep whatever's available (manual
  // payments still load below) and tell the client so it can show a banner.
  let stripeError = false

  if (stripe) {
    try {
      const allPIs = await stripe.paymentIntents.list({ expand: ['data.latest_charge'] }).autoPagingToArray({ limit: PI_FETCH_LIMIT })
      if (allPIs.length >= PI_FETCH_LIMIT) {
        captureMessage('Revenue page hit its PaymentIntent fetch cap — totals may be missing older payments', { context: 'admin-revenue-list', limit: PI_FETCH_LIMIT })
      }
      const succeeded = allPIs.filter(pi => pi.metadata?.type && pi.status === 'succeeded')

      // Disputes are only recorded by the Stripe webhook (charge.dispute.*
      // handlers), which is the sole source of truth for a lost dispute —
      // Stripe's charge object never sets amount_refunded for one (that's a
      // separate mechanism from a refund), so without this a charged-back
      // payment kept counting its full amount as revenue collected. Matched
      // by stripe_payment_intent_id, NOT email — applications is one row per
      // email, so matching by email would wrongly zero out an unrelated
      // payment for the same person, or miss the dispute entirely if a later
      // payment already overwrote that row's status.
      const piIds = succeeded.map(pi => pi.id)
      let disputedLostPiIds = new Set()
      if (piIds.length > 0) {
        const supabase = createAdminClient()
        const { data: apps } = await supabase
          .from('applications')
          .select('stripe_payment_intent_id, stripe_payment_status')
          .in('stripe_payment_intent_id', piIds)
          .eq('stripe_payment_status', 'disputed_lost')
        if (apps) disputedLostPiIds = new Set(apps.map(a => a.stripe_payment_intent_id))
      }

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
          }
        })
        .sort((a, b) => new Date(b.stripe_paid_at) - new Date(a.stripe_paid_at))
    } catch (err) {
      console.error('Revenue page Stripe fetch failed:', err.message)
      stripeError = true
    }
  }

  // Also include manual (e-transfer) payments from DB. Dedupe against the
  // Stripe-sourced rows above by payment_intent_id, NOT email — matching by
  // email alone silently dropped a genuine manual payment for anyone who
  // ALSO has any unrelated Stripe payment (e.g. a membership paid by card,
  // and a separate route paid by e-transfer), undercounting real revenue
  // against what Stripe's own dashboard shows for the Stripe-only side.
  try {
    const supabase = createAdminClient()
    const stripePiIds = new Set(rows.map(r => r.id).filter(Boolean))
    const { data: manualApps } = await supabase
      .from('applications')
      .select('name, email, phone, stripe_amount_paid, stripe_payment_type, stripe_paid_at, stripe_payment_intent_id')
      .eq('stripe_payment_status', 'paid')
      .not('stripe_amount_paid', 'is', null)
    for (const a of (manualApps || [])) {
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
      })
    }
    rows.sort((a, b) => new Date(b.stripe_paid_at || 0) - new Date(a.stripe_paid_at || 0))
  } catch {}

  // Tax breakdown, keyed by PI id — only present for payments made after the
  // ledger shipped; older payments simply show no breakdown.
  let receiptsByPi = {}
  try {
    const supabase = createAdminClient()
    const piIds = rows.map(r => r.id).filter(Boolean)
    if (piIds.length > 0) {
      const { data: receipts } = await supabase.from('payment_receipts')
        .select('stripe_payment_intent_id, subtotal_amount, gst_amount, qst_amount, discount_amount')
        .in('stripe_payment_intent_id', piIds)
      if (receipts) for (const r of receipts) receiptsByPi[r.stripe_payment_intent_id] = r
    }
  } catch {}

  // Stats (total/by-type/by-month/recent) are all derived client-side from
  // `payments` in RevenueClient instead of here — that's what lets the page
  // offer a date-range filter that recomputes everything instantly instead
  // of round-tripping to the server on every range change.
  const toPaymentRow = r => {
    const receipt = r.id ? receiptsByPi[r.id] : null
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
      type:      TYPE_LABELS[r.stripe_payment_type] || r.stripe_payment_type || '—',
      date:      r.stripe_paid_at,
      taxSubtotal: receipt?.subtotal_amount != null ? receipt.subtotal_amount / 100 : null,
      taxGst:      receipt?.gst_amount != null ? receipt.gst_amount / 100 : null,
      taxQst:      receipt?.qst_amount != null ? receipt.qst_amount / 100 : null,
      taxDiscount: receipt?.discount_amount ? receipt.discount_amount / 100 : null,
    }
  }
  return <RevenueClient payments={rows.map(toPaymentRow)} stripeError={stripeError} />
}
