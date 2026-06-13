import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureException } from '../../../../lib/sentry'

async function getEventType(supabase, eventName) {
  const trimmed = eventName.trim()
  // Try exact match first, then base name (strips trailing " — Date" suffix)
  const { data: exact } = await supabase.from('events').select('type').ilike('name', trimmed).maybeSingle()
  if (exact) return exact.type || null
  const base = trimmed.split(/\s[—–]\s/)[0].trim()
  const { data: partial } = await supabase.from('events').select('type').ilike('name', `${base}%`).maybeSingle()
  return partial?.type || null
}

export async function GET(request, { params }) {
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

  const eventType = await getEventType(supabase, data.event_name)

  return Response.json({
    eventName: data.event_name,
    eventType,
    applicantName: data.applications?.name || '',
    alreadyConfirmed: !!data.confirmed_at,
    confirmedAt: data.confirmed_at,
    answers: data.answers,
  })
}

export async function POST(request, { params }) {
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

  const eventType = await getEventType(supabase, tokenRow.event_name)
  const isRoadTrip = eventType === 'Road Trip'

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
    const updated = app.registrations.map(r =>
      r.event?.trim().toLowerCase() === tokenRow.event_name?.trim().toLowerCase()
        ? { ...r, rsvp_confirmed: true, rsvp_confirmed_at: new Date().toISOString() }
        : r
    )
    await supabase.from('applications').update({ registrations: updated }).eq('id', tokenRow.application_id)
  }

  // Notify admin
  const appName  = tokenRow.applications?.name  || 'Someone'
  const appEmail = tokenRow.applications?.email || ''
  if (process.env.RESEND_API_KEY) {
    try {
      const answerLines = isRoadTrip
        ? [
            answers.dietary    ? `Dietary: ${answers.dietary}` : 'Dietary: None',
            answers.passengers !== null ? `People in car: ${answers.passengers}` : null,
            answers.whatsapp !== null ? `WhatsApp group: ${answers.whatsapp ? 'Yes' : 'No'}` : null,
          ]
        : [
            answers.bringing_guest !== null ? `Bringing a guest: ${answers.bringing_guest ? 'Yes' : 'No'}` : null,
            answers.car_paint  ? `Colour: ${answers.car_paint}` : null,
            answers.car_mods   ? `Mods: ${answers.car_mods}`    : null,
            answers.arrival    ? `Arrival: ${{ opening: 'Right at opening', first_hour: 'Within first hour', later: 'Later on' }[answers.arrival] || answers.arrival}` : null,
          ]
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Canvas Routes <info@canvasroutes.com>',
          to: 'jerry@canvasroutes.com',
          subject: `RSVP Confirmed — ${appName} — ${tokenRow.event_name}`,
          text: [
            `${appName} (${appEmail}) confirmed their spot for ${tokenRow.event_name}.`,
            ...answerLines.filter(Boolean),
          ].join('\n'),
        }),
      })
    } catch (err) {
      captureException(err, { context: 'rsvp-admin-notify', token })
    }
  }

  return Response.json({ confirmed: true, eventName: tokenRow.event_name })
}
