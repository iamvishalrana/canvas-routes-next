import { createClient } from '../../../../../../lib/supabase/server'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { stripe } from '../../../../../../lib/stripe.js'
import { checkRateLimit } from '../../../../../../lib/rateLimit'
import { captureException } from '../../../../../../lib/sentry'

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
    admin.from('events').select('id, name, registration_enabled, capacity, member_price, priority_window_end').eq('id', eventId).single(),
    admin.from('members').select('tier, name').eq('id', user.id).maybeSingle(),
  ])

  if (!ev) return Response.json({ error: 'Event not found.' }, { status: 404 })
  if (!ev.registration_enabled) return Response.json({ error: 'Registration is not open.' }, { status: 400 })
  if (!member) return Response.json({ error: 'Member record not found.' }, { status: 404 })

  const isInnerCircle = member.tier === 'inner_circle'

  if (ev.priority_window_end) {
    const windowEnd = new Date(ev.priority_window_end)
    if (new Date() < windowEnd && !isInnerCircle) {
      return Response.json({ error: 'Registration is not yet open for your membership tier.' }, { status: 403 })
    }
  }

  const { data: existing } = await admin.from('event_registrations')
    .select('id, stripe_payment_status')
    .eq('event_id', eventId)
    .eq('member_id', user.id)
    .maybeSingle()
  if (existing && ['free', 'paid'].includes(existing.stripe_payment_status)) {
    return Response.json({ error: 'You are already registered for this event.' }, { status: 400 })
  }

  if (ev.capacity) {
    const { count } = await admin.from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .in('stripe_payment_status', ['free', 'paid', 'pending'])
    if (count >= ev.capacity) return Response.json({ error: 'This event is at capacity.' }, { status: 400 })
  }

  const isFree = !ev.member_price || ev.member_price === 0

  if (isFree) {
    const { error } = await admin.from('event_registrations').upsert({
      event_id: eventId,
      member_id: user.id,
      email: user.email || '',
      name: member.name || '',
      stripe_payment_status: 'free',
      amount_paid: 0,
    }, { onConflict: 'event_id,member_id' })
    if (error) {
      captureException(error, { context: 'event-register-free', eventId })
      return Response.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
    }
    return Response.json({ success: true })
  }

  if (!paymentIntentId) return Response.json({ error: 'Payment intent ID required.' }, { status: 400 })
  if (!stripe) return Response.json({ error: 'Payments not configured.' }, { status: 503 })

  let pi
  try {
    pi = await stripe.paymentIntents.retrieve(paymentIntentId)
  } catch (err) {
    captureException(err, { context: 'event-register-retrieve-pi', eventId })
    return Response.json({ error: 'Could not verify payment.' }, { status: 500 })
  }

  if (pi.metadata?.event_id !== eventId || pi.metadata?.member_id !== user.id) {
    return Response.json({ error: 'Payment mismatch.' }, { status: 400 })
  }

  const payStatus = pi.status === 'succeeded' ? 'paid' : 'pending'

  const { error } = await admin.from('event_registrations').upsert({
    event_id: eventId,
    member_id: user.id,
    email: user.email || '',
    name: member.name || '',
    stripe_payment_intent_id: paymentIntentId,
    stripe_payment_status: payStatus,
    amount_paid: pi.amount_received || pi.amount,
  }, { onConflict: 'event_id,member_id' })

  if (error) {
    captureException(error, { context: 'event-register-paid', eventId })
    return Response.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }

  return Response.json({ success: true })
}
