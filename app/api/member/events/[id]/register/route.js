import { createClient } from '../../../../../../lib/supabase/server'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { stripe } from '../../../../../../lib/stripe.js'
import { checkRateLimit } from '../../../../../../lib/rateLimit'
import { captureException } from '../../../../../../lib/sentry'

export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const origin = request.headers.get('origin')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'
  if (origin && !origin.startsWith('http://localhost') && origin !== siteUrl) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

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
    admin.from('events').select('id, name, registration_opens_at, registration_closes_at, capacity, member_price, priority_window_end, registration_enabled').eq('id', eventId).single(),
    admin.from('members').select('tier, name').eq('id', user.id).maybeSingle(),
  ])

  if (!ev) return Response.json({ error: 'Event not found.' }, { status: 404 })
  if (ev.registration_enabled === false) return Response.json({ error: 'Registration is not open for this event.' }, { status: 400 })

  const now = new Date()
  const regOpen = ev.registration_opens_at && now >= new Date(ev.registration_opens_at) && (!ev.registration_closes_at || now <= new Date(ev.registration_closes_at))
  if (!regOpen) return Response.json({ error: 'Registration is not open.' }, { status: 400 })
  if (!member) return Response.json({ error: 'Member record not found.' }, { status: 404 })

  if (ev.priority_window_end && now < new Date(ev.priority_window_end) && member.tier !== 'inner_circle') {
    return Response.json({ error: 'Registration is not yet open for your membership tier.' }, { status: 403 })
  }

  // Early-exit if already registered (before any PI work)
  const { data: existing } = await admin.from('event_registrations')
    .select('stripe_payment_status').eq('event_id', eventId).eq('member_id', user.id).maybeSingle()
  if (existing && ['free', 'paid'].includes(existing.stripe_payment_status)) {
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
    p_email:                    user.email || '',
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
    return Response.json({ error: rpcResult.error }, { status: 400 })
  }

  // Notify admin
  if (process.env.RESEND_API_KEY) {
    const memberName = member.name?.trim() || user.email.split('@')[0]
    const amountLabel = isFree ? 'Free' : `$${(amountPaid / 100).toFixed(2)} CAD`
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: 'info@canvasroutes.com',
        subject: `Event Registration — ${ev.name} — ${memberName}`,
        text: `New member registration\n\nEvent: ${ev.name}\nName: ${memberName}\nEmail: ${user.email}\nPayment: ${amountLabel}`,
      }),
    }).catch(() => {})
  }

  return Response.json({ success: true })
}
