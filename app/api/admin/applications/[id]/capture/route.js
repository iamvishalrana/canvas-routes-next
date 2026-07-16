import { after } from 'next/server'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { stripe } from '../../../../../../lib/stripe.js'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry.js'
import { buildWtetConfirmHtml } from '../../../../../../lib/wtetEmail.js'
import { buildAdminNotifyHtml } from '../../../../../../lib/adminEmail.js'
import { logAdminAction } from '../../../../../../lib/adminAudit.js'

export async function POST(request, { params }) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })
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
  if (app.stripe_payment_status && !['pending', 'authorized'].includes(app.stripe_payment_status)) {
    return Response.json({ error: `Cannot capture: payment status is '${app.stripe_payment_status}'.` }, { status: 400 })
  }

  const piId = app.stripe_payment_intent_id

  let pi
  try {
    pi = await stripe.paymentIntents.retrieve(piId)
  } catch (err) {
    captureException(err, { context: 'admin-app-capture-pi-retrieve', appId: id, piId })
    return Response.json({ error: 'Could not verify payment.' }, { status: 500 })
  }

  // Authoritative Stripe-side status check — the DB status is only a proxy
  if (pi.status === 'succeeded') return Response.json({ error: 'Already captured.' }, { status: 400 })
  if (pi.status !== 'requires_capture') {
    return Response.json({ error: `Payment cannot be captured (Stripe status: ${pi.status}).` }, { status: 400 })
  }

  // Claim stripe_paid_at BEFORE capturing — the succeeded webhook can land within
  // milliseconds of capture and reads stripe_paid_at to decide whether this route
  // already sent the confirmation email
  const { error: claimErr } = await supabase.from('applications')
    .update({ stripe_paid_at: new Date().toISOString() })
    .eq('id', id)
  if (claimErr) captureException(claimErr, { context: 'admin-app-capture-claim', appId: id })

  try {
    await stripe.paymentIntents.capture(piId, {}, { idempotencyKey: `capture-${piId}` })
  } catch (err) {
    // Roll back the claim so a retry (or the webhook) can still send the email
    await supabase.from('applications').update({ stripe_paid_at: null }).eq('id', id)
    captureException(err, { context: 'admin-approve-capture', appId: id })
    return Response.json({ error: err.message || 'Capture failed.' }, { status: 500 })
  }

  // Capture succeeded — update DB separately so a DB error doesn't surface as "Capture failed"
  const { error: dbErr } = await supabase.from('applications').update({
    stripe_payment_status: 'paid',
    stripe_amount_paid: pi.amount,
  }).eq('id', id)
  if (dbErr) captureException(dbErr, { context: 'admin-capture-db-write', appId: id })

  await logAdminAction(supabase, admin.email, {
    action: 'payment.capture',
    entityType: 'application',
    entityId: id,
    entityName: app.name || app.email,
    metadata: { amount: pi.amount, email: app.email },
  })

  // Send emails — WTET confirmation or membership approval notification
  if (process.env.RESEND_API_KEY && pi.metadata?.type?.startsWith('membership_')) {
    const email     = (pi.metadata.email || app.email)?.toLowerCase().trim()
    const name      = pi.metadata.name || app.name || ''
    const firstName = name.trim().split(' ')[0] || 'there'
    const tierLabel = pi.metadata.type === 'membership_inner_circle' ? 'Inner Circle' : 'Routes Member'
    const amount    = `$${(pi.amount / 100).toFixed(2)} CAD`
    after(() => Promise.allSettled([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Canvas Routes <info@canvasroutes.com>',
          to: email,
          reply_to: 'info@canvasroutes.com',
          subject: `Your Canvas Routes membership is approved, ${firstName}`,
          text: `Hey ${firstName},\n\nYour ${tierLabel} membership application has been approved and your payment of ${amount} has been processed.\n\nWe're setting up your account now — you'll receive a separate email shortly with your login details and everything you need to get started.\n\nWelcome to Canvas Routes.\n\nJerry`,
        }),
      }).catch(err => captureException(err, { context: 'admin-app-capture-membership-email', appId: id })),
    ]))
  }

  if (process.env.RESEND_API_KEY && pi.metadata?.type?.startsWith('road_trip_') && pi.metadata?.is_member !== 'yes') {
    const email      = (pi.metadata.email || app.email)?.toLowerCase().trim()
    const name       = pi.metadata.name || app.name || email?.split('@')[0] || 'there'
    const firstName  = name.trim().split(' ')[0]
    const eventLabel = pi.metadata.event_name || 'Canvas Routes Road Trip'
    const amount     = `$${(pi.amount / 100).toFixed(2)} CAD`
    // WTET has its own frozen check-in page; other routes don't have an
    // equivalent wired up yet, so omit the button for them.
    const checkinUrl = pi.metadata?.type === 'road_trip_wtet' ? `https://canvasroutes.com/wtet/checkin?t=${piId}` : null

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
      }).catch(err => captureException(err, { context: 'admin-app-capture-confirm-email', appId: id })),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Canvas Routes <info@canvasroutes.com>',
          to: 'jerry@canvasroutes.com',
          subject: `Payment Captured — ${name}`,
          html: buildAdminNotifyHtml('Payment captured', [
            ['Name',      `<strong>${name}</strong>`],
            ['Email',     `<a href="mailto:${email}" style="color:#1a1a1a;">${email}</a>`],
            ['Amount',    amount],
            ['Car',       pi.metadata?.car_model || '—'],
            ['Passengers',pi.metadata?.passengers || '—'],
            ['Children',  pi.metadata?.has_children || '—'],
            ['PI',        piId],
          ]),
        }),
      }).catch(err => captureException(err, { context: 'admin-app-capture-admin-email', appId: id })),
    ]))
  }

  return Response.json({ ok: true })
}
