import { stripe } from '../../../../lib/stripe.js'
import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { checkRateLimit } from '../../../../lib/rateLimit.js'
import { captureException } from '../../../../lib/sentry.js'

export async function POST(request) {
  if (!stripe) return Response.json({ error: 'Payments not configured.' }, { status: 503 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown'
  if (await checkRateLimit(ip)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { eventId } = body
  if (!eventId) return Response.json({ error: 'Event ID required.' }, { status: 400 })

  const admin = createAdminClient()

  const [{ data: ev }, { data: member }] = await Promise.all([
    admin.from('events').select('id, name, date, registration_enabled, capacity, member_price, priority_window_end').eq('id', eventId).single(),
    admin.from('members').select('tier, name').eq('id', user.id).maybeSingle(),
  ])

  if (!ev) return Response.json({ error: 'Event not found.' }, { status: 404 })
  if (!ev.registration_enabled) return Response.json({ error: 'Registration is not open for this event.' }, { status: 400 })
  if (!member) return Response.json({ error: 'Member record not found.' }, { status: 404 })

  const isInnerCircle = member.tier === 'inner_circle'

  if (ev.priority_window_end) {
    const windowEnd = new Date(ev.priority_window_end)
    if (new Date() < windowEnd && !isInnerCircle) {
      return Response.json({
        error: `Priority registration is open to Inner Circle until ${windowEnd.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.`,
        priorityWindowEnd: ev.priority_window_end,
      }, { status: 403 })
    }
  }

  if (ev.capacity) {
    const { count } = await admin.from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .in('stripe_payment_status', ['free', 'paid'])
    if (count >= ev.capacity) return Response.json({ error: 'This event is at capacity.' }, { status: 400 })
  }

  const { data: existing } = await admin.from('event_registrations')
    .select('id, stripe_payment_status')
    .eq('event_id', eventId)
    .eq('member_id', user.id)
    .maybeSingle()
  if (existing && ['free', 'paid'].includes(existing.stripe_payment_status)) {
    return Response.json({ error: 'You are already registered for this event.' }, { status: 400 })
  }

  const amount = ev.member_price || 0
  if (amount === 0) return Response.json({ error: 'Use the free registration endpoint.' }, { status: 400 })

  try {
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: 'cad',
      receipt_email: user.email,
      metadata: {
        type: 'event_registration',
        event_id: eventId,
        event_name: ev.name,
        member_id: user.id,
        email: user.email || '',
        name: member.name || '',
        tier: member.tier || 'routes_member',
      },
      description: `Canvas Routes — ${ev.name}`,
      automatic_payment_methods: { enabled: true },
    })
    return Response.json({ clientSecret: pi.client_secret, amount })
  } catch (err) {
    captureException(err, { context: 'event-payment-intent', eventId })
    return Response.json({ error: 'Failed to initialise payment.' }, { status: 500 })
  }
}
