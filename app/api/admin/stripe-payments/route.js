import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { stripe } from '../../../../lib/stripe.js'
import { createAdminClient } from '../../../../lib/supabase/admin'

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  const supabase = createAdminClient()

  const piList = await stripe.paymentIntents.list({ limit: 100, expand: ['data.latest_charge'] })

  // Filter to Canvas Routes payments only
  const canvasPIs = piList.data.filter(pi => pi.metadata?.type)

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

    // Determine normalized status
    let stripe_payment_status
    const charge = pi.latest_charge
    if (charge && typeof charge === 'object' && charge.refunded) {
      stripe_payment_status = 'refunded'
    } else if (pi.status === 'succeeded') {
      stripe_payment_status = 'paid'
    } else if (pi.status === 'requires_capture') {
      stripe_payment_status = 'authorized'
    } else if (pi.status === 'canceled') {
      stripe_payment_status = 'rejected'
    } else if (pi.status === 'requires_payment_method' || pi.status === 'payment_failed') {
      stripe_payment_status = 'failed'
    } else {
      stripe_payment_status = pi.status
    }

    return {
      id: app?.id || null,
      stripe_payment_intent_id: pi.id,
      name: pi.metadata.name || '',
      email,
      stripe_amount_paid: pi.status === 'succeeded' ? pi.amount_received : pi.amount,
      stripe_payment_status,
      stripe_payment_type: pi.metadata.type || '',
      stripe_paid_at: new Date(pi.created * 1000).toISOString(),
    }
  })

  records.sort((a, b) => new Date(b.stripe_paid_at) - new Date(a.stripe_paid_at))

  // Sync any records missing stripe fields back to the applications table
  const toSync = records.filter(r => r.email && r.stripe_payment_intent_id && !appsByEmail[r.email]?.stripe_payment_status)
  if (toSync.length > 0) {
    await supabase.from('applications').upsert(
      toSync.map(r => ({
        email:                    r.email,
        name:                     r.name || undefined,
        stripe_payment_intent_id: r.stripe_payment_intent_id,
        stripe_payment_status:    r.stripe_payment_status,
        stripe_amount_paid:       r.stripe_amount_paid,
        stripe_payment_type:      r.stripe_payment_type,
        stripe_paid_at:           r.stripe_paid_at,
      })),
      { onConflict: 'email' }
    ).catch(() => {})
  }

  return Response.json(records)
}
