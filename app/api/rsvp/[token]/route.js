import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureException } from '../../../../lib/sentry'
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit'
import { buildEventConfirmHtml } from '../../../../lib/eventConfirmEmail'
import { logMemberAction } from '../../../../lib/memberActivityLog'
import { emailShell, infoCard, COLOR, escapeEmail } from '../../../../lib/emailLayout'

async function getEvent(supabase, eventName) {
  const trimmed = eventName.trim()
  const cols = 'id, type, date, date_display, location'
  // Try exact match first, then base name (strips trailing " — Date" suffix)
  const { data: exact } = await supabase.from('events').select(cols).ilike('name', trimmed).maybeSingle()
  if (exact) return exact
  const base = trimmed.split(/\s[—–]\s/)[0].trim()
  const { data: partial } = await supabase.from('events').select(cols).ilike('name', `${base}%`).maybeSingle()
  return partial || null
}

export async function GET(request, { params }) {
  const ip = getClientIp(request)
  if (ip && await checkRateLimit(ip, 60, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  const { token } = await params
  if (!token) return Response.json({ error: 'Invalid link.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('rsvp_tokens')
    .select('id, event_name, expires_at, confirmed_at, answers, application_id, applications(name, email)')
    .eq('token', token)
    .single()

  if (!data) return Response.json({ error: 'This invitation link is not valid.' }, { status: 404 })

  const now = new Date()
  if (new Date(data.expires_at) <= now && !data.confirmed_at) {
    return Response.json({ error: "This invitation has expired. Please reply to your invite email and we'll sort it out.", expired: true }, { status: 410 })
  }

  const event = await getEvent(supabase, data.event_name)

  return Response.json({
    eventName: data.event_name,
    eventType: event?.type || null,
    applicantName: data.applications?.name || '',
    alreadyConfirmed: !!data.confirmed_at,
    confirmedAt: data.confirmed_at,
    answers: data.answers,
  })
}

export async function POST(request, { params }) {
  const ip = getClientIp(request)
  if (ip && await checkRateLimit(ip, 20, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  const { token } = await params
  if (!token) return Response.json({ error: 'Invalid link.' }, { status: 400 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }

  const supabase = createAdminClient()
  const { data: tokenRow } = await supabase
    .from('rsvp_tokens')
    .select('id, event_name, expires_at, confirmed_at, application_id, applications(name, email, phone)')
    .eq('token', token)
    .single()

  if (!tokenRow) return Response.json({ error: 'This invitation link is not valid.' }, { status: 404 })
  if (new Date(tokenRow.expires_at) <= new Date() && !tokenRow.confirmed_at) {
    return Response.json({ error: 'This invitation has expired.', expired: true }, { status: 410 })
  }
  if (tokenRow.confirmed_at) return Response.json({ alreadyConfirmed: true, eventName: tokenRow.event_name })

  const event = await getEvent(supabase, tokenRow.event_name)
  const isRoadTrip = event?.type === 'Road Trip' || event?.type === 'Route'

  // Build answers based on event type
  const answers = isRoadTrip
    ? {
        dietary:           (body.dietary || '').trim() || null,
        passengers:        body.passengers ?? null,
        whatsapp:          body.whatsapp ?? null,
        passenger_details: Array.isArray(body.passenger_details) ? body.passenger_details.filter(p => p.name?.trim() || p.age?.trim()) : [],
      }
    : {
        bringing_guest: body.bringing_guest ?? null,
        car_paint:      (body.car_paint || '').trim() || null,
        car_mods:       (body.car_mods  || '').trim() || null,
        arrival:        body.arrival || null,
      }

  const { error: updateErr } = await supabase
    .from('rsvp_tokens')
    .update({ confirmed_at: new Date().toISOString(), answers })
    .eq('token', token)

  if (updateErr) {
    captureException(updateErr, { context: 'rsvp-confirm', token })
    return Response.json({ error: 'Could not confirm your spot. Please try again.' }, { status: 500 })
  }

  // Update applications.registrations to mark confirmed
  const { data: app } = await supabase.from('applications').select('registrations').eq('id', tokenRow.application_id).single()
  if (app?.registrations) {
    const evBase = (s) => s?.trim().toLowerCase().split(/\s[—–]\s/)[0].trim() || ''
    const tokenBase = evBase(tokenRow.event_name)
    const updated = app.registrations.map(r =>
      evBase(r.event) === tokenBase
        ? { ...r, rsvp_confirmed: true, rsvp_confirmed_at: new Date().toISOString() }
        : r
    )
    const { error: regUpdateErr } = await supabase.from('applications').update({ registrations: updated }).eq('id', tokenRow.application_id)
    if (regUpdateErr) captureException(regUpdateErr, { context: 'rsvp-confirm-reg-update', token })
  }

  // Notify admin + send final invite to registrant
  const appName  = tokenRow.applications?.name  || 'Someone'
  const appEmail = tokenRow.applications?.email || ''
  const isMember = appEmail ? !!(await supabase.from('members').select('id').eq('email', appEmail.toLowerCase()).maybeSingle()).data : false
  const profileUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'}/rsvp/${token}/profile`
  if (process.env.RESEND_API_KEY) {
    const arrivalLabel = { opening: 'Right at opening', first_hour: 'Within the first hour', later: 'Later on' }
    const roadTripRows = [
      ['Dietary', escapeEmail(answers.dietary || 'None')],
      answers.passengers != null && ['People in car', String(answers.passengers)],
      answers.whatsapp != null && ['WhatsApp group', answers.whatsapp ? 'Yes' : 'No'],
    ]
    const meetRows = [
      answers.bringing_guest != null && ['Bringing a guest', answers.bringing_guest ? 'Yes' : 'No'],
      answers.car_paint && ['Car colour', escapeEmail(answers.car_paint)],
      answers.car_mods && ['Mods', escapeEmail(answers.car_mods)],
      answers.arrival && ['Arrival', escapeEmail(arrivalLabel[answers.arrival] || answers.arrival)],
    ]
    const adminHtml = emailShell({
      title: 'RSVP confirmed',
      eyebrow: 'Canvas Routes &middot; Internal',
      heading: 'RSVP confirmed',
      body: infoCard([
        ['Event', `<strong>${escapeEmail(tokenRow.event_name)}</strong>`],
        ['Name', `<strong>${escapeEmail(appName)}</strong>`],
        ['Email', `<a href="mailto:${escapeEmail(appEmail)}" style="color:${COLOR.head};">${escapeEmail(appEmail)}</a>`],
        tokenRow.applications?.phone && ['Phone', escapeEmail(tokenRow.applications.phone)],
        ...(isRoadTrip ? roadTripRows : meetRows),
      ], { mb: '0' }),
    })

    // Await both sends — fire-and-forget was causing ETIMEDOUT when the function terminated mid-write
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: 'jerry@canvasroutes.com',
        subject: `RSVP Confirmed — ${appName} — ${tokenRow.event_name}`,
        html: adminHtml,
      }),
    }).catch(err => captureException(err, { context: 'rsvp-admin-notify', token }))

    if (appEmail) {
      const firstName = appName.split(' ')[0]
      try {
        const html = buildEventConfirmHtml({
          firstName,
          eventName: tokenRow.event_name,
          dateDisplay: event?.date_display || null,
          location: event?.location || null,
          isFree: true,
          amountPaid: 0,
          eventId: event?.id || null,
          date: event?.date || null,
          isMember,
          profileUrl,
        })
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Canvas Routes <jerry@canvasroutes.com>',
            to: appEmail,
            reply_to: 'jerry@canvasroutes.com',
            subject: `You're in — ${tokenRow.event_name}`,
            html,
            text: `Hey ${firstName},\n\nYou're confirmed for ${tokenRow.event_name}${event?.date_display ? ` on ${event.date_display}` : ''}${event?.location ? ` at ${event.location}` : ''}.\n\nWe'll be in touch with final details closer to the date.\n\nSee you there,\nJerry\nCanvas Routes`,
          }),
        }).catch(err => captureException(err, { context: 'rsvp-final-invite', token }))
      } catch (err) {
        captureException(err, { context: 'rsvp-final-invite', token })
      }
    }
  }

  await logMemberAction(appEmail, { action: 'self.rsvp', entityType: 'event', entityId: event?.id || null, entityName: tokenRow.event_name })
  return Response.json({ confirmed: true, eventName: tokenRow.event_name })
}
