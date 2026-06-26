import { after } from 'next/server'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { stripe } from '../../../../../../lib/stripe.js'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry.js'
import { buildWtetConfirmHtml } from '../../../../../../lib/wtetEmail.js'

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!stripe) return Response.json({ error: 'Not configured.' }, { status: 503 })

  const { piId } = await params
  if (!piId || !piId.startsWith('pi_')) return Response.json({ error: 'Invalid payment intent ID.' }, { status: 400 })

  const supabase = createAdminClient()

  // Look up by PI ID first; fall back to email from Stripe if not yet synced by webhook
  let app = null
  const { data: appByPi } = await supabase.from('applications')
    .select('id, email, name, stripe_payment_status')
    .eq('stripe_payment_intent_id', piId)
    .maybeSingle()
  app = appByPi

  let pi
  if (!app) {
    try {
      pi = await stripe.paymentIntents.retrieve(piId)
    } catch (err) {
      captureException(err, { context: 'admin-capture-pi-retrieve', piId })
      return Response.json({ error: 'Payment not found.' }, { status: 404 })
    }
    const email = pi.metadata?.email?.toLowerCase().trim()
    if (email) {
      const { data: appByEmail } = await supabase.from('applications')
        .select('id, email, name, stripe_payment_status')
        .eq('email', email)
        .maybeSingle()
      app = appByEmail
    }
  }

  if (!app) return Response.json({ error: 'Payment not found.' }, { status: 404 })
  if (app.stripe_payment_status === 'paid') return Response.json({ error: 'Already captured.' }, { status: 400 })
  if (app.stripe_payment_status && !['pending', 'authorized'].includes(app.stripe_payment_status)) {
    return Response.json({ error: `Payment cannot be captured (status: ${app.stripe_payment_status}).` }, { status: 400 })
  }

  // Retrieve PI if we haven't yet (needed for amount and metadata)
  if (!pi) {
    try {
      pi = await stripe.paymentIntents.retrieve(piId)
    } catch (err) {
      captureException(err, { context: 'admin-capture-pi-retrieve-2', piId })
      return Response.json({ error: 'Could not verify payment.' }, { status: 500 })
    }
  }

  try {
    await stripe.paymentIntents.capture(piId, {}, { idempotencyKey: `capture-${piId}` })
  } catch (err) {
    captureException(err, { context: 'admin-capture-stripe', piId })
    return Response.json({ error: err.message || 'Capture failed.' }, { status: 500 })
  }

  // Update DB — best-effort; webhook will rescue if this fails
  const { error: dbErr } = await supabase.from('applications')
    .update({ stripe_payment_status: 'paid', stripe_paid_at: new Date().toISOString(), stripe_amount_paid: pi.amount })
    .eq('stripe_payment_intent_id', piId)
  if (dbErr) captureException(dbErr, { context: 'admin-capture-db', piId })

  // Send confirmation email to registrant — belt-and-suspenders alongside the webhook
  if (process.env.RESEND_API_KEY && pi.metadata?.type === 'road_trip_wtet' && pi.metadata?.is_member !== 'yes') {
    const email      = pi.metadata.email?.toLowerCase().trim()
    const name       = pi.metadata.name || email?.split('@')[0] || 'there'
    const firstName  = name.trim().split(' ')[0]
    const eventLabel = pi.metadata.event_name || 'Whips to Eastern Townships — July 5, 2026'
    const amount     = `$${(pi.amount / 100).toFixed(2)} CAD`
    const checkinUrl = `https://canvasroutes.com/wtet/checkin?t=${piId}`

    after(() => Promise.allSettled([
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
      }).catch(err => captureException(err, { context: 'admin-capture-confirm-email', piId })),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Canvas Routes <info@canvasroutes.com>',
          to: 'jerry@canvasroutes.com',
          subject: `WTET Payment Captured — ${name}`,
          text: `You captured the WTET payment for ${name}.\n\nEmail: ${email}\nAmount: ${amount}\nCar: ${pi.metadata?.car_model || '—'}\nPassengers: ${pi.metadata?.passengers || '—'}\nChildren: ${pi.metadata?.has_children || '—'}\nPI: ${piId}`,
        }),
      }).catch(err => captureException(err, { context: 'admin-capture-admin-email', piId })),
    ]))
  }

  return Response.json({ ok: true })
}
