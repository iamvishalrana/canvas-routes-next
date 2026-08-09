import { after } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { stripe } from '../../../lib/stripe.js'
import { captureException, captureMessage } from '../../../lib/sentry.js'
import { checkRateLimit, getClientIp } from '../../../lib/rateLimit.js'
import { buildRoadTripConfirmHtml } from '../../../lib/roadTripConfirmEmail.js'
import { buildAdminNotifyHtml } from '../../../lib/adminEmail.js'
import { markRegistrationPaid } from '../../../lib/markRegistrationPaid.js'
import { getRouteCheckinUrl } from '../../../lib/routeEventLink.js'

const EVENT_NAME = 'The Calabogie Boogie — Track Day — September 13, 2026'

// Called by the Calabogie Boogie page immediately after stripe.confirmPayment()
// succeeds for members. Mirrors app/api/hello-to-montebello-member-confirm/route.js.
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request' }, { status: 400 }) }

  const { paymentIntentId } = body
  if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
    return Response.json({ error: 'Invalid payment intent ID' }, { status: 400 })
  }

  if (!stripe) return Response.json({ error: 'Payments not configured' }, { status: 503 })

  let pi
  try {
    pi = await stripe.paymentIntents.retrieve(paymentIntentId)
  } catch (err) {
    captureException(err, { context: 'calabogie-member-confirm-retrieve', piId: paymentIntentId })
    return Response.json({ error: 'Could not verify payment' }, { status: 500 })
  }

  // Guard: must be a succeeded member Calabogie Boogie payment belonging to this user
  if (pi.status !== 'succeeded') return Response.json({ error: 'Payment not yet confirmed' }, { status: 400 })
  if (pi.metadata?.type !== 'road_trip_the-calabogie-boogie-2026') return Response.json({ error: 'Invalid payment type' }, { status: 400 })
  if (pi.metadata?.is_member !== 'yes') return Response.json({ error: 'Not a member payment' }, { status: 400 })
  if (pi.metadata?.email?.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const normalEmail = user.email.toLowerCase().trim()
  const memberName = pi.metadata?.name || normalEmail.split('@')[0]
  const firstName = memberName.trim().split(' ')[0] || 'there'
  const amount = `$${(pi.amount_received / 100).toFixed(2)} CAD`

  const admin = createAdminClient()

  // Unconditionally update payment fields — safe to run multiple times.
  const { error: confirmDbErr } = await admin.from('applications').update({
    stripe_payment_intent_id: pi.id,
    stripe_payment_status: 'paid',
    stripe_amount_paid: pi.amount_received,
    stripe_payment_type: 'road_trip_the-calabogie-boogie-2026',
  }).eq('email', normalEmail)
  if (confirmDbErr) captureException(confirmDbErr, { context: 'calabogie-member-confirm-db', piId: pi.id })

  // Durable per-event proof — see lib/markRegistrationPaid.js. Runs regardless
  // of the email-claim outcome below so it's set even on a retried/duplicate call.
  await markRegistrationPaid(admin, normalEmail, EVENT_NAME).catch(err => captureException(err, { context: 'calabogie-member-confirm-mark-paid', piId: pi.id }))

  // Atomic compare-and-swap: only set stripe_paid_at if not already set.
  // Whichever concurrent call wins this update (normal flow vs 3DS redirect handler)
  // is the one that sends emails — prevents duplicate confirmation emails.
  const { data: claimedRows } = await admin.from('applications').update({
    stripe_paid_at: new Date().toISOString(),
  }).eq('email', normalEmail).is('stripe_paid_at', null).select('id')

  if (!claimedRows?.length) return Response.json({ ok: true })

  if (!process.env.RESEND_API_KEY) return Response.json({ ok: true })

  // Resolves via upcoming_routes.event_id — currently no row for this slug
  // (page is unlaunched/unlinked), so this returns null today. Using the
  // generic helper instead of hardcoding null means the check-in button
  // appears automatically once the route is added to upcoming_routes with a
  // linked check-in event, no code change needed. See lib/routeEventLink.js.
  const checkinUrl = await getRouteCheckinUrl(admin, 'road_trip_the-calabogie-boogie-2026', normalEmail).catch(() => null)

  // Fire emails after response — after() keeps the function alive until both fetches settle.
  after(() => Promise.allSettled([
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: normalEmail,
        reply_to: 'jerry@canvasroutes.com',
        subject: `Payment confirmed — ${EVENT_NAME}`,
        html: buildRoadTripConfirmHtml(firstName, amount, checkinUrl, EVENT_NAME),
        text: `Hey ${firstName},\n\nYour payment of ${amount} for ${EVENT_NAME} is confirmed.\n\n${checkinUrl ? `Complete your trip details here: ${checkinUrl}\n\n` : ''}Meetup is at 12 PM in LaSalle — full details closer to the date. Follow @canvasroutes on Instagram for updates.\n\nSee you on the road,\nJerry\nCanvas Routes`,
      }),
    }).then(r => { if (r && !r.ok) captureMessage(`Resend non-200 — calabogie-member-confirm-member-email`, { status: r.status }) }).catch(err => captureException(err, { context: 'calabogie-member-confirm-member-email', email: normalEmail })),
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: 'jerry@canvasroutes.com',
        subject: `Member Payment Confirmed — ${memberName}`,
        html: buildAdminNotifyHtml('Member payment confirmed', [
          ['Event',    EVENT_NAME],
          ['Name',     `<strong>${memberName}</strong>`],
          ['Email',    `<a href="mailto:${normalEmail}" style="color:#1a1a1a;">${normalEmail}</a>`],
          ['Amount',   amount],
          ['Vehicle',  pi.metadata?.car_model || '—'],
          ['PI',       pi.id],
        ]),
      }),
    }).then(r => { if (r && !r.ok) captureMessage(`Resend non-200 — calabogie-member-confirm-admin-email`, { status: r.status }) }).catch(err => captureException(err, { context: 'calabogie-member-confirm-admin-email', email: normalEmail })),
  ]))

  return Response.json({ ok: true })
}
