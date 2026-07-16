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

  // Retrieve PI if we haven't yet (needed for amount, metadata, and the status check)
  if (!pi) {
    try {
      pi = await stripe.paymentIntents.retrieve(piId)
    } catch (err) {
      captureException(err, { context: 'admin-capture-pi-retrieve-2', piId })
      return Response.json({ error: 'Could not verify payment.' }, { status: 500 })
    }
  }

  // Authoritative Stripe-side status check — the DB status is only a proxy and
  // can be stale (the found-by-email fallback reads a row whose status may
  // reflect a different flow entirely)
  if (pi.status === 'succeeded') return Response.json({ error: 'Already captured.' }, { status: 400 })
  if (pi.status !== 'requires_capture') {
    return Response.json({ error: `Payment cannot be captured (Stripe status: ${pi.status}).` }, { status: 400 })
  }

  // Claim stripe_paid_at BEFORE capturing — the succeeded webhook can land within
  // milliseconds of capture and reads stripe_paid_at to decide whether this route
  // already sent the confirmation email. Also syncs the PI id onto rows found via
  // the email fallback (updating by PI id would match zero rows for those).
  const { error: claimErr } = await supabase.from('applications')
    .update({ stripe_paid_at: new Date().toISOString(), stripe_payment_intent_id: piId })
    .eq('id', app.id)
  if (claimErr) captureException(claimErr, { context: 'admin-capture-claim', piId })

  try {
    await stripe.paymentIntents.capture(piId, {}, { idempotencyKey: `capture-${piId}` })
  } catch (err) {
    // Roll back the claim so a retry (or the webhook) can still send the email
    await supabase.from('applications').update({ stripe_paid_at: null }).eq('id', app.id)
    captureException(err, { context: 'admin-capture-stripe', piId })
    return Response.json({ error: err.message || 'Capture failed.' }, { status: 500 })
  }

  // Update DB — best-effort; webhook will rescue if this fails
  const { error: dbErr } = await supabase.from('applications')
    .update({ stripe_payment_status: 'paid', stripe_amount_paid: pi.amount })
    .eq('id', app.id)
  if (dbErr) captureException(dbErr, { context: 'admin-capture-db', piId })

  await logAdminAction(supabase, admin.email, {
    action: 'payment.capture',
    entityType: 'payment_intent',
    entityId: piId,
    entityName: app.name || app.email,
    metadata: { amount: pi.amount, email: app.email },
  })

  // Send emails — WTET confirmation or membership approval notification
  if (process.env.RESEND_API_KEY && pi.metadata?.type?.startsWith('membership_')) {
    const email     = pi.metadata.email?.toLowerCase().trim() || app.email
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
      }).catch(err => captureException(err, { context: 'admin-capture-membership-email', piId })),
    ]))
  }

  if (process.env.RESEND_API_KEY && pi.metadata?.type?.startsWith('road_trip_') && pi.metadata?.is_member !== 'yes') {
    const email      = pi.metadata.email?.toLowerCase().trim()
    const name       = pi.metadata.name || email?.split('@')[0] || 'there'
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
      }).catch(err => captureException(err, { context: 'admin-capture-confirm-email', piId })),
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
      }).catch(err => captureException(err, { context: 'admin-capture-admin-email', piId })),
    ]))
  }

  return Response.json({ ok: true })
}
