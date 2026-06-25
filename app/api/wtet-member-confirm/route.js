import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { stripe } from '../../../lib/stripe.js'
import { captureException } from '../../../lib/sentry.js'
import { checkRateLimit } from '../../../lib/rateLimit.js'
import { buildWtetConfirmHtml } from '../../../lib/wtetEmail.js'

const EVENT_NAME = 'Whips to Eastern Townships — July 5, 2026'

// Called by the WTET page immediately after stripe.confirmPayment() succeeds for members.
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim() || 'unknown'
  if (await checkRateLimit(ip)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

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
    captureException(err, { context: 'wtet-member-confirm-retrieve', piId: paymentIntentId })
    return Response.json({ error: 'Could not verify payment' }, { status: 500 })
  }

  // Guard: must be a succeeded member WTET payment belonging to this user
  if (pi.status !== 'succeeded') return Response.json({ error: 'Payment not yet confirmed' }, { status: 400 })
  if (pi.metadata?.type !== 'road_trip_wtet') return Response.json({ error: 'Invalid payment type' }, { status: 400 })
  if (pi.metadata?.is_member !== 'yes') return Response.json({ error: 'Not a member payment' }, { status: 400 })
  if (pi.metadata?.email?.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const normalEmail = user.email.toLowerCase().trim()
  const memberName = pi.metadata?.name || normalEmail.split('@')[0]
  const firstName = memberName.trim().split(' ')[0] || 'there'
  const amount = `$${(pi.amount_received / 100).toFixed(2)} CAD`
  const checkinUrl = `https://canvasroutes.com/wtet/checkin?t=${pi.id}`

  const admin = createAdminClient()

  // Idempotency guard — if already confirmed (e.g. 3DS redirect called this twice), skip email
  const { data: existingApp } = await admin.from('applications')
    .select('stripe_payment_status')
    .eq('email', normalEmail)
    .maybeSingle()
  const alreadyConfirmed = existingApp?.stripe_payment_status === 'paid'

  const { error: confirmDbErr } = await admin.from('applications').update({
    stripe_payment_intent_id: pi.id,
    stripe_payment_status: 'paid',
    stripe_amount_paid: pi.amount_received,
    stripe_payment_type: 'road_trip_wtet',
    stripe_paid_at: new Date().toISOString(),
  }).eq('email', normalEmail)
  if (confirmDbErr) captureException(confirmDbErr, { context: 'wtet-member-confirm-db', piId: pi.id })

  if (!process.env.RESEND_API_KEY || alreadyConfirmed) return Response.json({ ok: true })

  // Fire emails async — do not await (rule #8)
  Promise.allSettled([
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: normalEmail,
        reply_to: 'jerry@canvasroutes.com',
        subject: `Payment confirmed — ${EVENT_NAME}`,
        html: buildWtetConfirmHtml(firstName, amount, checkinUrl, EVENT_NAME),
        text: `Hey ${firstName},\n\nYour payment of ${amount} for ${EVENT_NAME} is confirmed.\n\nYou'll receive a full itinerary and all event details closer to the date. Follow @canvasroutes on Instagram for updates.\n\nSee you on the road,\nJerry\nCanvas Routes`,
      }),
    }).catch(err => captureException(err, { context: 'wtet-member-confirm-member-email', email: normalEmail })),
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: 'jerry@canvasroutes.com',
        subject: `WTET Member Payment Confirmed — ${memberName}`,
        text: `Member payment confirmed for ${EVENT_NAME}.\n\nName: ${memberName}\nEmail: ${normalEmail}\nAmount: ${amount}\nCar: ${pi.metadata?.car_model || '—'}\nPassengers: ${pi.metadata?.passengers || '—'}\nChildren: ${pi.metadata?.has_children || '—'}\nPI: ${pi.id}`,
      }),
    }).catch(err => captureException(err, { context: 'wtet-member-confirm-admin-email', email: normalEmail })),
  ])

  return Response.json({ ok: true })
}
