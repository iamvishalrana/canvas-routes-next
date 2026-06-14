import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureException } from '../../../../lib/sentry'
import { checkRateLimit } from '../../../../lib/rateLimit'
import { buildEventConfirmHtml } from '../../../../lib/eventConfirmEmail'

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
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim()
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
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim()
  if (ip && await checkRateLimit(ip, 20, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  const { token } = await params
  if (!token) return Response.json({ error: 'Invalid link.' }, { status: 400 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }

  const supabase = createAdminClient()
  const { data: tokenRow } = await supabase
    .from('rsvp_tokens')
    .select('id, event_name, expires_at, confirmed_at, application_id, applications(name, email)')
    .eq('token', token)
    .single()

  if (!tokenRow) return Response.json({ error: 'This invitation link is not valid.' }, { status: 404 })
  if (new Date(tokenRow.expires_at) <= new Date() && !tokenRow.confirmed_at) {
    return Response.json({ error: 'This invitation has expired.', expired: true }, { status: 410 })
  }
  if (tokenRow.confirmed_at) return Response.json({ alreadyConfirmed: true, eventName: tokenRow.event_name })

  const event = await getEvent(supabase, tokenRow.event_name)
  const isRoadTrip = event?.type === 'Road Trip'

  // Build answers based on event type
  const answers = isRoadTrip
    ? {
        dietary:    (body.dietary || '').trim() || null,
        passengers: body.passengers ?? null,
        whatsapp:   body.whatsapp ?? null,
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
  if (process.env.RESEND_API_KEY) {
    const row = (label, value) => value != null && value !== ''
      ? `<tr><td width="160" style="width:160px;padding:8px 12px 8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#888888;vertical-align:top;">${label}</td><td style="padding:8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;vertical-align:top;">${value}</td></tr>`
      : ''
    const arrivalLabel = { opening: 'Right at opening', first_hour: 'Within the first hour', later: 'Later on' }
    const adminHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/></head>
<body style="margin:0;padding:0;background-color:#ffffff;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px;width:100%;">
      <tr><td style="padding-bottom:20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888888;">RSVP confirmed</td></tr>
      <tr><td>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${row('Event', `<strong>${tokenRow.event_name}</strong>`)}
          ${row('Name', `<strong>${appName}</strong>`)}
          ${row('Email', `<a href="mailto:${appEmail}" style="color:#1a1a1a;">${appEmail}</a>`)}
          ${isRoadTrip ? `
          ${row('Dietary', answers.dietary || 'None')}
          ${row('People in car', answers.passengers != null ? String(answers.passengers) : '')}
          ${row('WhatsApp group', answers.whatsapp != null ? (answers.whatsapp ? 'Yes' : 'No') : '')}
          ` : `
          ${row('Bringing a guest', answers.bringing_guest != null ? (answers.bringing_guest ? 'Yes' : 'No') : '')}
          ${row('Car colour', answers.car_paint || '')}
          ${row('Mods', answers.car_mods || '')}
          ${row('Arrival', answers.arrival ? (arrivalLabel[answers.arrival] || answers.arrival) : '')}
          `}
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`

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
        })
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Canvas Routes <info@canvasroutes.com>',
            to: appEmail,
            reply_to: 'info@canvasroutes.com',
            subject: `You're in — ${tokenRow.event_name}`,
            html,
          }),
        }).catch(err => captureException(err, { context: 'rsvp-final-invite', token }))
      } catch (err) {
        captureException(err, { context: 'rsvp-final-invite', token })
      }
    }
  }

  return Response.json({ confirmed: true, eventName: tokenRow.event_name })
}
