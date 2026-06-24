import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { stripe } from '../../../../lib/stripe.js'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureException } from '../../../../lib/sentry.js'

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  const supabase = createAdminClient()

  let allPIs
  try {
    allPIs = await stripe.paymentIntents.list({ expand: ['data.latest_charge'] }).autoPagingToArray({ limit: 2000 })
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

  const records = canvasPIs.map(pi => {
    const email = pi.metadata.email?.toLowerCase().trim() || ''
    const app = appsByEmail[email] || null

    // Determine normalized status and refund amount
    let stripe_payment_status
    const charge = pi.latest_charge
    const amountRefunded = (charge && typeof charge === 'object') ? (charge.amount_refunded || 0) : 0
    const fullyRefunded  = (charge && typeof charge === 'object') ? charge.refunded : false

    if (fullyRefunded) {
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

    return {
      id: app?.id || null,
      stripe_payment_intent_id: pi.id,
      name: pi.metadata.name || '',
      email,
      // amount_received is 0 until captured; use pi.amount for authorized holds
      stripe_amount_paid: pi.status === 'requires_capture' ? pi.amount : pi.amount_received,
      stripe_amount_refunded: amountRefunded,
      stripe_payment_status,
      stripe_payment_type: pi.metadata.type || '',
      // Use actual charge timestamp when available; fall back to PI creation time
      stripe_paid_at: (charge && typeof charge === 'object' && charge.created)
        ? new Date(charge.created * 1000).toISOString()
        : new Date(pi.created * 1000).toISOString(),
    }
  })

  // Also pull manual (non-Stripe) payments from DB — e-transfers, cash, etc.
  const stripeEmails = new Set(records.map(r => r.email).filter(Boolean))
  const { data: manualApps, error: manualErr } = await supabase
    .from('applications')
    .select('id, name, email, stripe_payment_status, stripe_amount_paid, stripe_payment_type, stripe_paid_at, stripe_payment_intent_id')
    .not('stripe_payment_status', 'is', null)
    .not('stripe_amount_paid', 'is', null)
  if (!manualErr) {
    for (const a of (manualApps || [])) {
      const email = a.email?.toLowerCase().trim()
      if (!email || stripeEmails.has(email)) continue
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
