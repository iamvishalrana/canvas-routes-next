import { stripe } from '../../../lib/stripe.js'
import { createAdminClient } from '../../../lib/supabase/admin'
import PaymentsClient from './PaymentsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Payments — Admin' }

export default async function PaymentsPage() {
  const records = []

  // Fetch from Stripe
  if (stripe) {
    try {
      const piList = await stripe.paymentIntents.list({ limit: 100, expand: ['data.latest_charge'] })
      const canvasPIs = piList.data.filter(pi => pi.metadata?.type)

      for (const pi of canvasPIs) {
        const email = pi.metadata.email?.toLowerCase().trim() || ''
        const charge = pi.latest_charge
        const amountRefunded = (charge && typeof charge === 'object') ? (charge.amount_refunded || 0) : 0
        const fullyRefunded  = (charge && typeof charge === 'object') ? charge.refunded : false

        let stripe_payment_status
        if (fullyRefunded)        stripe_payment_status = 'refunded'
        else if (amountRefunded > 0) stripe_payment_status = 'partially_refunded'
        else if (pi.status === 'succeeded')              stripe_payment_status = 'paid'
        else if (pi.status === 'requires_capture')       stripe_payment_status = 'authorized'
        else if (pi.status === 'canceled')               stripe_payment_status = 'rejected'
        else if (['requires_payment_method','payment_failed'].includes(pi.status)) stripe_payment_status = 'failed'
        else stripe_payment_status = pi.status

        records.push({
          id:                       null,
          stripe_payment_intent_id: pi.id,
          name:                     pi.metadata.name || '',
          email,
          stripe_amount_paid:       pi.status === 'succeeded' ? pi.amount_received : pi.amount,
          stripe_amount_refunded:   amountRefunded,
          stripe_payment_status,
          stripe_payment_type:      pi.metadata.type || '',
          stripe_paid_at:           new Date(pi.created * 1000).toISOString(),
          manual:                   false,
        })
      }
    } catch (e) {
      console.error('Stripe fetch failed:', e.message)
    }
  }

  // Also fetch manual (e-transfer) payments from DB
  try {
    const supabase = createAdminClient()
    const stripeEmails = new Set(records.map(r => r.email))
    const { data: manualApps } = await supabase
      .from('applications')
      .select('id, name, email, stripe_payment_status, stripe_amount_paid, stripe_payment_type, stripe_paid_at, stripe_payment_intent_id')
      .not('stripe_payment_status', 'is', null)
      .not('stripe_amount_paid', 'is', null)

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
  } catch (e) {
    console.error('DB manual payments fetch failed:', e.message)
  }

  records.sort((a, b) => new Date(b.stripe_paid_at || 0) - new Date(a.stripe_paid_at || 0))

  return <PaymentsClient initialRecords={records} />
}
