import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { stripe } from '../../../../../../lib/stripe.js'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry.js'
import { buildWtetConfirmHtml } from '../../../../../../lib/wtetEmail.js'

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
  if (app.stripe_payment_status === 'paid') return Response.json({ error: 'Already captured.' }, { status: 400 })
  if (app.stripe_payment_status !== 'authorized') return Response.json({ error: 'Payment is not in an authorized state.' }, { status: 400 })

  const piId = app.stripe_payment_intent_id

  let pi
  try {
    pi = await stripe.paymentIntents.retrieve(piId)
  } catch (err) {
    captureException(err, { context: 'admin-app-capture-pi-retrieve', appId: id, piId })
    return Response.json({ error: 'Could not verify payment.' }, { status: 500 })
  }

  try {
    await stripe.paymentIntents.capture(piId, {}, { idempotencyKey: `capture-${id}` })

    const { error: dbErr } = await supabase.from('applications').update({
      stripe_payment_status: 'paid',
      stripe_paid_at: new Date().toISOString(),
    }).eq('id', id)

    if (dbErr) {
      captureException(dbErr, { context: 'admin-capture-db-write', appId: id })
    }
  } catch (err) {
    captureException(err, { context: 'admin-approve-capture', appId: id })
    return Response.json({ error: err.message || 'Capture failed.' }, { status: 500 })
  }

  // Send confirmation email to registrant — belt-and-suspenders alongside the webhook
  if (process.env.RESEND_API_KEY && pi.metadata?.type === 'road_trip_wtet' && pi.metadata?.is_member !== 'yes') {
    const email      = (pi.metadata.email || app.email)?.toLowerCase().trim()
    const name       = pi.metadata.name || app.name || email?.split('@')[0] || 'there'
    const firstName  = name.trim().split(' ')[0]
    const eventLabel = pi.metadata.event_name || 'Whips to Eastern Townships — July 5, 2026'
    const amount     = `$${(pi.amount / 100).toFixed(2)} CAD`
    const checkinUrl = `https://canvasroutes.com/wtet/checkin?t=${piId}`

    await Promise.all([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Canvas Routes <info@canvasroutes.com>',
          to: email,
          reply_to: 'jerry@canvasroutes.com',
          subject: `Payment confirmed — ${eventLabel}`,
          html: buildWtetConfirmHtml(firstName, amount, checkinUrl, eventLabel),
          text: `Hey ${firstName},\n\nYour payment of ${amount} for ${eventLabel} is confirmed.\n\nYou'll receive a full itinerary and all event details closer to the date. Follow @canvasroutes on Instagram for updates.\n\nSee you on the road,\nJerry\nCanvas Routes`,
        }),
      }).catch(err => captureException(err, { context: 'admin-app-capture-confirm-email', appId: id })),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Canvas Routes <info@canvasroutes.com>',
          to: 'jerry@canvasroutes.com',
          subject: `WTET Payment Captured — ${name}`,
          text: `You captured the WTET payment for ${name}.\n\nEmail: ${email}\nAmount: ${amount}\nCar: ${pi.metadata?.car_model || '—'}\nPassengers: ${pi.metadata?.passengers || '—'}\nChildren: ${pi.metadata?.has_children || '—'}\nPI: ${piId}`,
        }),
      }).catch(err => captureException(err, { context: 'admin-app-capture-admin-email', appId: id })),
    ])
  }

  return Response.json({ ok: true })
}
