import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { captureException } from '../../../../../lib/sentry'
import { buildInviteHtml } from '../../../../../lib/inviteEmail'
import { MONTREAL_TZ } from '../../../../../lib/mtlTime'

async function getEventType(supabase, eventName) {
  const { data } = await supabase
    .from('events')
    .select('type')
    .ilike('name', eventName.trim())
    .maybeSingle()
  return data?.type || null
}


export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!process.env.RESEND_API_KEY) return Response.json({ error: 'Email not configured.' }, { status: 503 })

  const { applicationId, eventName, eventDate, eventLocation, isResend = false } = await request.json().catch(() => ({}))
  if (!applicationId || !eventName) return Response.json({ error: 'applicationId and eventName required.' }, { status: 400 })

  const supabase = createAdminClient()

  const [{ data: app }, eventType] = await Promise.all([
    supabase.from('applications').select('id, name, email').eq('id', applicationId).single(),
    getEventType(supabase, eventName),
  ])
  if (!app) return Response.json({ error: 'Application not found.' }, { status: 404 })

  const isRoadTrip = eventType === 'Road Trip' || eventType === 'Route'

  // Expire 7 days from now (or 48h before event if date is within 7 days)
  const now = new Date()
  let expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  if (eventDate) {
    const evDate = new Date(eventDate)
    const cutoff = new Date(evDate.getTime() - 48 * 60 * 60 * 1000)
    if (cutoff < expiresAt) expiresAt = cutoff
  }
  if (expiresAt <= now) expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  // Preserve confirmed_at and answers if already set — re-inviting must not un-confirm
  const { data: existingToken } = await supabase
    .from('rsvp_tokens')
    .select('confirmed_at, answers')
    .eq('application_id', applicationId)
    .eq('event_name', eventName)
    .maybeSingle()

  const { data: tokenRow, error: tokenErr } = await supabase
    .from('rsvp_tokens')
    .upsert({
      application_id: applicationId,
      event_name: eventName,
      expires_at: expiresAt.toISOString(),
      confirmed_at: existingToken?.confirmed_at ?? null,
      answers: existingToken?.answers ?? null,
      declined_at: null,
    }, { onConflict: 'application_id,event_name', ignoreDuplicates: false })
    .select('token')
    .single()

  if (tokenErr || !tokenRow) {
    captureException(tokenErr, { context: 'rsvp-token-upsert', applicationId, eventName })
    return Response.json({ error: 'Failed to create invitation.' }, { status: 500 })
  }

  const firstName = (app.name || '').trim().split(' ')[0] || 'there'
  const rsvpUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'}/rsvp/${tokenRow.token}`
  const textSignoff = isRoadTrip ? 'See you on the road' : 'See you there'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <jerry@canvasroutes.com>',
        to: app.email,
        reply_to: 'jerry@canvasroutes.com',
        subject: isResend ? `Reminder — your spot at ${eventName}` : `You're invited — ${eventName}`,
        html: buildInviteHtml(firstName, eventName, eventDate, eventLocation, rsvpUrl, expiresAt.toISOString(), isRoadTrip, isResend),
        text: isResend
          ? `Hey ${firstName},\n\nJust a reminder — your invitation to ${eventName} is still open. Check in here:\n${rsvpUrl}\n\nThis link expires ${expiresAt.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', timeZone: MONTREAL_TZ })}.\n\n${textSignoff},\nJerry`
          : `Hey ${firstName},\n\nYou're invited to ${eventName}. Check in here:\n${rsvpUrl}\n\nThis link expires ${expiresAt.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', timeZone: MONTREAL_TZ })}.\n\n${textSignoff},\nJerry`,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      captureException(new Error(err), { context: 'rsvp-invite-email', applicationId })
      return Response.json({ error: 'Failed to send invitation email.' }, { status: 500 })
    }
  } catch (err) {
    captureException(err, { context: 'rsvp-invite-email-network', applicationId })
    return Response.json({ error: 'Failed to send invitation email.' }, { status: 500 })
  }

  return Response.json({ ok: true, expiresAt: expiresAt.toISOString() })
}
