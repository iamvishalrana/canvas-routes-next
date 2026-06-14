import { createClient } from '../../../../../../lib/supabase/server'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry'
import { checkRateLimit } from '../../../../../../lib/rateLimit'
import { buildEventConfirmHtml } from '../../../../../../lib/eventConfirmEmail'

export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim() || 'unknown'
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  const { id: eventId } = await params
  const admin = createAdminClient()

  const [{ data: ev }, { data: member }] = await Promise.all([
    admin.from('events').select('id, name, date, date_display, location, registration_enabled, registration_url, registration_opens_at, registration_closes_at, capacity, priority_window_end').eq('id', eventId).single(),
    admin.from('members').select('name, car_year, car_make, car_model, phone, instagram, tier').eq('id', user.id).maybeSingle(),
  ])

  if (!ev) return Response.json({ error: 'Event not found.' }, { status: 404 })
  if (!member) return Response.json({ error: 'Member profile not found.' }, { status: 404 })
  if (ev.registration_enabled === false) return Response.json({ error: 'Registration is not open for this event.' }, { status: 400 })

  const now = new Date()
  if (ev.registration_opens_at && now < new Date(ev.registration_opens_at)) {
    if (ev.priority_window_end && now < new Date(ev.priority_window_end) && member.tier !== 'inner_circle') {
      return Response.json({ error: 'Registration is not yet open for your membership tier.' }, { status: 403 })
    }
    if (!ev.priority_window_end || member.tier !== 'inner_circle') {
      return Response.json({ error: 'Registration is not open yet.' }, { status: 400 })
    }
  }
  if (ev.registration_closes_at && now > new Date(ev.registration_closes_at)) {
    return Response.json({ error: 'Registration has closed for this event.' }, { status: 400 })
  }
  if (ev.capacity) {
    const { count } = await admin.from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId).in('stripe_payment_status', ['free', 'paid'])
    if (count >= ev.capacity) return Response.json({ error: 'This event is at capacity.' }, { status: 400 })
  }

  // Guard against double-registration — only block confirmed rows, not stale pending
  const { data: existing } = await admin.from('event_registrations')
    .select('id').eq('event_id', eventId).eq('member_id', user.id)
    .in('stripe_payment_status', ['free', 'paid']).maybeSingle()
  if (existing) return Response.json({ alreadyRegistered: true, success: true })

  const memberName = member.name?.trim() || user.email.split('@')[0]
  const normalEmail = user.email.toLowerCase().trim()

  // Write to event_registrations atomically (RPC enforces capacity at DB level)
  const { data: rpcResult, error: regErr } = await admin.rpc('register_for_event', {
    p_event_id:                 eventId,
    p_member_id:                user.id,
    p_email:                    normalEmail,
    p_name:                     memberName,
    p_stripe_payment_intent_id: null,
    p_stripe_payment_status:    'free',
    p_amount_paid:              0,
  })
  if (regErr) {
    captureException(regErr, { context: 'free-register-event-reg', eventId, memberId: user.id })
    return Response.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
  if (rpcResult?.error) {
    return Response.json({ error: rpcResult.error }, { status: 400 })
  }

  if (process.env.RESEND_API_KEY) {
    const firstName = memberName.split(' ')[0] || 'there'
    const dateDisplay = ev.date_display || ev.date || null

    await Promise.all([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Canvas Routes <jerry@canvasroutes.com>',
          to: normalEmail,
          reply_to: 'jerry@canvasroutes.com',
          subject: `You're registered — ${ev.name}`,
          html: buildEventConfirmHtml({ firstName, eventName: ev.name, dateDisplay, location: ev.location || null, isFree: true, amountPaid: 0, eventId, date: ev.date || null }),
          text: `Hey ${firstName},\n\nYou're registered for ${ev.name}${dateDisplay ? ` on ${dateDisplay}` : ''}${ev.location ? ` at ${ev.location}` : ''}.\n\nSee you there,\nJerry\nCanvas Routes`,
        }),
      }).catch(err => captureException(err, { context: 'free-register-member-email', eventId })),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Canvas Routes <info@canvasroutes.com>',
          to: 'info@canvasroutes.com',
          subject: `Event Registration — ${ev.name} — ${memberName}`,
          text: `New member registration\n\nEvent: ${ev.name}\nName: ${memberName}\nEmail: ${normalEmail}\nPayment: Free`,
        }),
      }).catch(err => captureException(err, { context: 'free-register-admin-email', eventId })),
    ])
  }

  // Also write to applications + contacts so they appear in the admin event registrants panel
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) try {
    const { data: existingApp } = await admin
      .from('applications')
      .select('id, registrations')
      .eq('email', normalEmail)
      .maybeSingle()

    const newReg = { event: ev.name, registered_at: new Date().toISOString(), attended: null }
    const prevRegs = (existingApp?.registrations || []).filter(r => r.event !== ev.name)

    const { data: appData, error: appErr } = await admin.from('applications').upsert({
      email: normalEmail,
      name: memberName,
      car_year: member.car_year || null,
      car_model: [member.car_make, member.car_model].filter(Boolean).join(' ') || null,
      phone: member.phone || null,
      instagram: member.instagram || null,
      source: 'Canvas Routes Member',
      registrations: [...prevRegs, newReg],
      ...(existingApp ? { reregistered_at: new Date().toISOString() } : {}),
    }, { onConflict: 'email' }).select('id').single()

    if (!appErr && appData?.id) {
      await admin.from('contacts').upsert(
        { application_id: appData.id },
        { onConflict: 'application_id', ignoreDuplicates: true }
      )
    }
  } catch (e) {
    captureException(e, { context: 'free-register-applications', eventId })
    // Don't fail — event_registrations already succeeded
  }

  return Response.json({ success: true })
}
