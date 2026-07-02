import { after } from 'next/server'
import { createClient } from '../../../../../../lib/supabase/server'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { stripe } from '../../../../../../lib/stripe.js'
import { checkRateLimit } from '../../../../../../lib/rateLimit'
import { captureException } from '../../../../../../lib/sentry'
import { buildEventConfirmHtml } from '../../../../../../lib/eventConfirmEmail'
import { buildAdminNotifyHtml } from '../../../../../../lib/adminEmail'

export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown'
  if (await checkRateLimit(ip)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  const { id: eventId } = await params
  let body
  try { body = await request.json() } catch { body = {} }
  const { paymentIntentId } = body

  const admin = createAdminClient()

  const [{ data: ev }, { data: member }] = await Promise.all([
    admin.from('events').select('id, name, date, date_display, location, registration_opens_at, registration_closes_at, capacity, member_price, priority_window_end, registration_enabled').eq('id', eventId).single(),
    admin.from('members').select('tier, name').eq('id', user.id).maybeSingle(),
  ])

  if (!ev) return Response.json({ error: 'Event not found.' }, { status: 404 })
  if (ev.registration_enabled === false) return Response.json({ error: 'Registration is not open for this event.' }, { status: 400 })

  if (!member) return Response.json({ error: 'Member record not found.' }, { status: 404 })

  // Gate model (must match event-payment-intent + the UI): nobody before
  // registration_opens_at; Inner Circle only until priority_window_end; then all.
  const now = new Date()
  if (ev.registration_opens_at && now < new Date(ev.registration_opens_at)) {
    return Response.json({ error: 'Registration is not open yet.' }, { status: 400 })
  }
  if (ev.priority_window_end && now < new Date(ev.priority_window_end) && member.tier !== 'inner_circle') {
    return Response.json({ error: 'Registration is currently open to Inner Circle members only.' }, { status: 403 })
  }
  if (ev.registration_closes_at && now > new Date(ev.registration_closes_at)) {
    return Response.json({ error: 'Registration has closed for this event.' }, { status: 400 })
  }

  // Early-exit if already registered (before any PI work)
  const { data: existing } = await admin.from('event_registrations')
    .select('stripe_payment_status, stripe_payment_intent_id').eq('event_id', eventId).eq('member_id', user.id).maybeSingle()
  if (existing && ['free', 'paid'].includes(existing.stripe_payment_status)) {
    // If the webhook already wrote 'paid' for this exact PI before this API call landed,
    // treat it as a successful idempotent registration rather than an error.
    if (existing.stripe_payment_status === 'paid' && paymentIntentId && existing.stripe_payment_intent_id === paymentIntentId) {
      // Webhook completed the registration first — still claim + send the
      // confirmation email if nobody has yet
      await claimAndSendEmails({ admin, ev, eventId, user, member, isFree: false, amountPaid: existing.amount_paid ?? ev.member_price ?? 0 })
      return Response.json({ success: true })
    }
    return Response.json({ error: 'You are already registered for this event.' }, { status: 400 })
  }

  // Early-exit capacity pre-check (non-atomic, UX only — the RPC enforces it atomically)
  if (ev.capacity) {
    const { count } = await admin.from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId).in('stripe_payment_status', ['free', 'paid'])
    if (count >= ev.capacity) return Response.json({ error: 'This event is at capacity.' }, { status: 400 })
  }

  const isFree = !ev.member_price || ev.member_price === 0
  let amountPaid = 0
  let piId = null

  if (!isFree) {
    if (!paymentIntentId) return Response.json({ error: 'Payment intent ID required.' }, { status: 400 })
    if (!stripe) return Response.json({ error: 'Payments not configured.' }, { status: 503 })
    let pi
    try { pi = await stripe.paymentIntents.retrieve(paymentIntentId) } catch (err) {
      captureException(err, { context: 'event-register-retrieve-pi', eventId })
      return Response.json({ error: 'Could not verify payment.' }, { status: 500 })
    }
    if (pi.metadata?.event_id !== eventId || pi.metadata?.member_id !== user.id) {
      return Response.json({ error: 'Payment mismatch.' }, { status: 400 })
    }
    if (pi.status !== 'succeeded') {
      return Response.json({ error: 'Payment has not been completed.' }, { status: 400 })
    }
    if (pi.amount_received < ev.member_price) {
      captureException(new Error('Event PI amount below event price'), { context: 'event-register-amount-check', piId: paymentIntentId, piAmount: pi.amount_received, eventPrice: ev.member_price })
      return Response.json({ error: 'Payment amount does not match event price.' }, { status: 400 })
    }
    amountPaid = pi.amount_received
    piId = paymentIntentId
  }

  // Final capacity check before writing (non-atomic — best-effort guard)
  if (ev.capacity) {
    const { count } = await admin.from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .in('stripe_payment_status', ['free', 'paid'])
    if (count >= ev.capacity) return Response.json({ error: 'This event is at capacity.' }, { status: 400 })
  }

  const { data: rpcResult, error: regError } = await admin.rpc('register_for_event', {
    p_event_id:                 eventId,
    p_member_id:                user.id,
    p_email:                    (user.email || '').toLowerCase().trim(),
    p_name:                     member.name || '',
    p_stripe_payment_intent_id: piId,
    p_stripe_payment_status:    isFree ? 'free' : 'paid',
    p_amount_paid:              amountPaid,
  })

  if (regError) {
    captureException(regError, { context: 'event-register-rpc', eventId })
    return Response.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
  if (rpcResult?.error) {
    // Auto-refund if the card was already charged — prevents "contact us" dead-end when capacity fills mid-flow
    if (!isFree && piId && stripe) {
      try {
        await stripe.refunds.create({ payment_intent: piId }, { idempotencyKey: `refund-cap-${piId}` })
        return Response.json({ error: rpcResult.error, refunded: true }, { status: 400 })
      } catch (refundErr) {
        captureException(refundErr, { context: 'event-register-capacity-refund', piId })
      }
    }
    return Response.json({ error: rpcResult.error }, { status: 400 })
  }

  await claimAndSendEmails({ admin, ev, eventId, user, member, isFree, amountPaid })

  return Response.json({ success: true })
}

// Atomic email claim: the webhook can also complete this registration (3DS
// redirects skip the client's register call), so both paths attempt a
// conditional UPDATE on confirmation_email_sent_at — only the winner sends.
async function claimAndSendEmails({ admin, ev, eventId, user, member, isFree, amountPaid }) {
  if (!process.env.RESEND_API_KEY) return

  let shouldSend = true
  const { data: claimRows, error: claimErr } = await admin
    .from('event_registrations')
    .update({ confirmation_email_sent_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('member_id', user.id)
    .is('confirmation_email_sent_at', null)
    .select('id')
  if (claimErr) {
    // Column missing (migration not yet run) — fall back to always sending
    captureException(new Error(claimErr.message), { context: 'event-register-email-claim', eventId })
  } else {
    shouldSend = (claimRows || []).length > 0
  }
  if (!shouldSend) return

  const memberName = member.name?.trim() || user.email.split('@')[0]
  const firstName = memberName.split(' ')[0] || 'there'
  const amountLabel = isFree ? 'Free' : `$${(amountPaid / 100).toFixed(2)} CAD`
  const dateDisplay = ev.date_display || ev.date || null

  after(() => Promise.allSettled([
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <jerry@canvasroutes.com>',
        to: (user.email || '').toLowerCase().trim(),
        reply_to: 'jerry@canvasroutes.com',
        subject: `You're registered — ${ev.name}`,
        html: buildEventConfirmHtml({ firstName, eventName: ev.name, dateDisplay, location: ev.location || null, isFree, amountPaid, eventId, date: ev.date || null }),
        text: `Hey ${firstName},\n\nYou're registered for ${ev.name}${dateDisplay ? ` on ${dateDisplay}` : ''}${ev.location ? ` at ${ev.location}` : ''}${!isFree ? `. Payment: ${amountLabel}` : ''}.\n\nSee you there,\nJerry\nCanvas Routes`,
      }),
    }).catch(err => captureException(err, { context: 'event-register-member-email', eventId })),
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: 'info@canvasroutes.com',
        subject: `Event Registration — ${ev.name} — ${memberName}`,
        html: buildAdminNotifyHtml('New event registration', [
          ['Event',   `<strong>${ev.name}</strong>`],
          ['Name',    `<strong>${memberName}</strong>`],
          ['Email',   `<a href="mailto:${user.email}" style="color:#1a1a1a;">${user.email}</a>`],
          ['Tier',    member.tier || '—'],
          ['Payment', amountLabel],
        ]),
      }),
    }).catch(err => captureException(err, { context: 'event-register-admin-email', eventId })),
  ]))
}
