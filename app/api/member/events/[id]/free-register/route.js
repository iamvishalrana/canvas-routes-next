import { after } from 'next/server'
import { deviceType } from '../../../../../../lib/deviceType'
import { createClient } from '../../../../../../lib/supabase/server'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry'
import { checkRateLimit, getClientIp } from '../../../../../../lib/rateLimit'
import { buildEventConfirmHtml } from '../../../../../../lib/eventConfirmEmail'
import { buildAdminNotifyHtml } from '../../../../../../lib/adminEmail'

export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  const { id: eventId } = await params
  const { lang } = await request.json().catch(() => ({}))
  const admin = createAdminClient()

  const [{ data: ev }, { data: member }] = await Promise.all([
    admin.from('events').select('id, name, date, date_display, location, registration_enabled, registration_url, registration_opens_at, registration_closes_at, capacity, priority_window_end').eq('id', eventId).single(),
    admin.from('members').select('name, car_year, car_make, car_model, phone, instagram, tier').eq('id', user.id).maybeSingle(),
  ])

  if (!ev) return Response.json({ error: 'Event not found.' }, { status: 404 })
  if (!member) return Response.json({ error: 'Member profile not found.' }, { status: 404 })
  if (ev.registration_enabled === false) return Response.json({ error: 'Registration is not open for this event.' }, { status: 400 })

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
    p_lang:                     lang === 'fr' ? 'fr' : 'en',
  })
  if (regErr) {
    captureException(regErr, { context: 'free-register-event-reg', eventId, memberId: user.id })
    return Response.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
  if (rpcResult?.error) {
    return Response.json({ error: rpcResult.error }, { status: 400 })
  }

  // Atomic claim — only one caller sends the confirmation email
  let shouldSendEmails = true
  const { data: claimRows, error: claimErr } = await admin
    .from('event_registrations')
    .update({ confirmation_email_sent_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('member_id', user.id)
    .is('confirmation_email_sent_at', null)
    .select('id')
  if (claimErr) captureException(new Error(claimErr.message), { context: 'free-register-email-claim', eventId })
  else shouldSendEmails = (claimRows || []).length > 0

  if (process.env.RESEND_API_KEY && shouldSendEmails) {
    const firstName = memberName.split(' ')[0] || 'there'
    const dateDisplay = ev.date_display || ev.date || null
    after(() => Promise.allSettled([
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
          html: buildAdminNotifyHtml('New event registration', [
            ['Event',     `<strong>${ev.name}</strong>`],
            ['Name',      `<strong>${memberName}</strong>`],
            ['Email',     `<a href="mailto:${normalEmail}" style="color:#1a1a1a;">${normalEmail}</a>`],
            ['Phone',     member.phone || '—'],
            ['Instagram', member.instagram ? `@${member.instagram}` : '—'],
            ['Tier',      member.tier || '—'],
            ['Car year',  member.car_year || '—'],
            ['Car',       [member.car_make, member.car_model].filter(Boolean).join(' ') || '—'],
            ['Payment',   'Free'],
          ]),
        }),
      }).catch(err => captureException(err, { context: 'free-register-admin-email', eventId })),
    ]))
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
      device_type: deviceType(request),
      email: normalEmail,
      name: memberName,
      car_year: member.car_year || null,
      car_model: [member.car_make, member.car_model].filter(Boolean).join(' ') || null,
      phone: member.phone || null,
      instagram: member.instagram || null,
      source: 'Canvas Routes Member',
      lang: lang === 'fr' ? 'fr' : 'en',
      registrations: [...prevRegs, newReg],
      ...(existingApp ? { reregistered_at: new Date().toISOString() } : {}),
    }, { onConflict: 'email' }).select('id').single()

    if (appErr) {
      captureException(new Error(appErr.message), { context: 'free-register-applications-upsert', eventId })
    } else if (appData?.id) {
      const { error: contactErr } = await admin.from('contacts').upsert(
        { application_id: appData.id },
        { onConflict: 'application_id', ignoreDuplicates: true }
      )
      if (contactErr) captureException(new Error(contactErr.message), { context: 'free-register-contacts-upsert', eventId })
    }
  } catch (e) {
    captureException(e, { context: 'free-register-applications', eventId })
    // Don't fail — event_registrations already succeeded
  }

  return Response.json({ success: true })
}
