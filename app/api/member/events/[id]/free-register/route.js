import { createClient } from '../../../../../../lib/supabase/server'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry'
import { checkRateLimit } from '../../../../../../lib/rateLimit'

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
    admin.from('events').select('id, name, registration_enabled, registration_url').eq('id', eventId).single(),
    admin.from('members').select('name, car_year, car_make, car_model, phone, instagram').eq('id', user.id).maybeSingle(),
  ])

  if (!ev) return Response.json({ error: 'Event not found.' }, { status: 404 })
  if (ev.registration_enabled === false) return Response.json({ error: 'Registration is not open for this event.' }, { status: 400 })
  if (!member) return Response.json({ error: 'Member profile not found.' }, { status: 404 })

  // Guard against double-registration
  const { data: existing } = await admin.from('event_registrations')
    .select('id').eq('event_id', eventId).eq('member_id', user.id).maybeSingle()
  if (existing) return Response.json({ alreadyRegistered: true, success: true })

  const memberName = member.name?.trim() || user.email.split('@')[0]
  const normalEmail = user.email.toLowerCase().trim()

  // Write to event_registrations so the member portal shows "Registered"
  const { error: regErr } = await admin.from('event_registrations').insert({
    event_id: eventId,
    member_id: user.id,
    email: normalEmail,
    name: memberName,
    stripe_payment_intent_id: null,
    stripe_payment_status: 'free',
    amount_paid: 0,
  })
  if (regErr) {
    captureException(regErr, { context: 'free-register-event-reg', eventId, memberId: user.id })
    return Response.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }

  // Notify admin
  if (process.env.RESEND_API_KEY) {
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: 'info@canvasroutes.com',
        subject: `Event Registration — ${ev.name} — ${memberName}`,
        text: `New member registration\n\nEvent: ${ev.name}\nName: ${memberName}\nEmail: ${normalEmail}\nPayment: Free`,
      }),
    }).catch(() => {})
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
