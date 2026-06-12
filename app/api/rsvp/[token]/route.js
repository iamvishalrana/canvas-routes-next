import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureException } from '../../../../lib/sentry'

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
    return Response.json({ error: 'This invitation has expired. Please reply to your invite email and we\'ll sort it out.', expired: true }, { status: 410 })
  }

  return Response.json({
    eventName: data.event_name,
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

  const answers = {
    dietary: (body.dietary || '').trim() || null,
    passengers: body.passengers ?? null,
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
  const appName = tokenRow.applications?.name || 'Someone'
  const appEmail = tokenRow.applications?.email || ''
  if (process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Canvas Routes <info@canvasroutes.com>',
          to: 'jerry@canvasroutes.com',
          subject: `RSVP Confirmed — ${appName} — ${tokenRow.event_name}`,
          text: [
            `${appName} (${appEmail}) confirmed their spot for ${tokenRow.event_name}.`,
            answers.dietary ? `Dietary: ${answers.dietary}` : null,
            answers.passengers !== null ? `Passengers: ${answers.passengers}` : null,
          ].filter(Boolean).join('\n'),
        }),
      })
    } catch (err) {
      captureException(err, { context: 'rsvp-admin-notify', token })
    }
  }

  return Response.json({ confirmed: true, eventName: tokenRow.event_name })
}
