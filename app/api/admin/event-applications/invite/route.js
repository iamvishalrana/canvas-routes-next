import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { captureException } from '../../../../../lib/sentry'

async function getEventType(supabase, eventName) {
  const { data } = await supabase
    .from('events')
    .select('type')
    .ilike('name', eventName.trim())
    .maybeSingle()
  return data?.type || null
}

function buildInviteHtml(firstName, eventName, eventDate, eventLocation, rsvpUrl, expiresAt, isRoadTrip, isResend) {
  const expiry = new Date(expiresAt).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
  const dateLabel = eventDate
    ? new Date(eventDate).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : eventDate

  const label = isRoadTrip ? 'Canvas Routes &middot; Road Trip &middot; You&rsquo;re Invited'
                            : 'Canvas Routes &middot; Car Meet &middot; You&rsquo;re Invited'

  const headline = isResend
    ? (isRoadTrip ? `Still here for you, ${firstName}.` : `Your spot&rsquo;s still open, ${firstName}.`)
    : (isRoadTrip ? `The road is calling, ${firstName}.` : `Your spot&rsquo;s ready, ${firstName}.`)

  const body = isResend
    ? (isRoadTrip
        ? `Just a quick reminder &mdash; your invitation to join us for <strong style="color:#F5F1EC;font-weight:400;">${eventName}</strong> is still open. Confirm your spot below before the link expires.`
        : `Just a quick reminder &mdash; your spot at <strong style="color:#F5F1EC;font-weight:400;">${eventName}</strong> is still available. One click and you&rsquo;re confirmed.`)
    : (isRoadTrip
        ? `We&rsquo;ve reviewed your application and we&rsquo;d love to have you on the road with us for <strong style="color:#F5F1EC;font-weight:400;">${eventName}</strong>. Confirm your spot below &mdash; we&rsquo;ll follow up with full route details as the date gets closer.`
        : `We&rsquo;ve reviewed your application and we&rsquo;d love to see you at <strong style="color:#F5F1EC;font-weight:400;">${eventName}</strong>. One click to confirm and you&rsquo;re in.`)

  const signoff = isRoadTrip
    ? `Questions about the route? Reply directly to this email &mdash; it comes straight to me.`
    : `Questions? Reply directly to this email &mdash; it comes straight to me.`

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#0F1E14;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F1E14;">
  <tr><td align="center" style="padding:48px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;">

      <tr><td style="padding-bottom:32px;"><img src="https://canvasroutes.com/canvas_routes_refined.png" alt="Canvas Routes" width="200" style="display:block;width:200px;height:auto;border:0;" /></td></tr>
      <tr><td style="padding-bottom:28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background-color:#c5a882;">&nbsp;</td></tr></table></td></tr>
      <tr><td style="padding-bottom:14px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;">${label}</td></tr>

      <tr><td style="padding-bottom:20px;font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:300;line-height:1.2;color:#F5F1EC;">
        ${headline}
      </td></tr>

      <tr><td style="padding-bottom:32px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.8;color:rgba(245,241,236,0.8);">
        ${body}
      </td></tr>

      <tr><td style="padding-bottom:32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:rgba(197,168,130,0.06);border:0.5px solid rgba(197,168,130,0.18);">
          <tr><td style="padding:24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="padding-bottom:16px;border-bottom:1px solid rgba(197,168,130,0.1);">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;">${isRoadTrip ? 'Route' : 'Event'}</div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#F5F1EC;">${eventName}</div>
              </td></tr>
              ${dateLabel ? `<tr><td style="padding-top:16px;padding-bottom:16px;border-bottom:1px solid rgba(197,168,130,0.1);">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;">Date</div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#F5F1EC;">${dateLabel}</div>
              </td></tr>` : ''}
              ${eventLocation ? `<tr><td style="padding-top:16px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;">${isRoadTrip ? 'Departure Point' : 'Location'}</div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#F5F1EC;">${eventLocation}</div>
              </td></tr>` : ''}
            </table>
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding-bottom:32px;" align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="background-color:#c5a882;">
            <a href="${rsvpUrl}" style="display:inline-block;padding:16px 40px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#0F1E14;text-decoration:none;font-weight:600;">Confirm My Spot &rarr;</a>
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding-bottom:28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:rgba(245,241,236,0.45);">
        This invitation link expires on <strong style="color:rgba(245,241,236,0.6);">${expiry}</strong>. If it expires before you can confirm, reply to this email and we&rsquo;ll sort it out.
      </td></tr>

      <tr><td style="padding-bottom:32px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:rgba(245,241,236,0.6);">
        ${signoff}<br/><br/>
        <span style="color:rgba(245,241,236,0.45);">&mdash; Jerry</span>
      </td></tr>

      <tr><td style="padding-bottom:28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border:1px solid rgba(197,168,130,0.35);"><a href="https://www.instagram.com/canvasroutes" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;text-decoration:none;">Follow &#64;canvasroutes &rarr;</a></td></tr></table></td></tr>

      <tr><td style="padding-top:20px;border-top:1px solid rgba(197,168,130,0.12);font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(245,241,236,0.3);line-height:1.8;">
        &copy; 2026 Canvas Routes. Montreal, QC.<br/>
        <a href="https://canvasroutes.com" style="color:rgba(197,168,130,0.4);text-decoration:none;">canvasroutes.com</a>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`
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

  const isRoadTrip = eventType === 'Road Trip'

  // Expire 7 days from now (or 48h before event if date is within 7 days)
  const now = new Date()
  let expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  if (eventDate) {
    const evDate = new Date(eventDate)
    const cutoff = new Date(evDate.getTime() - 48 * 60 * 60 * 1000)
    if (cutoff < expiresAt) expiresAt = cutoff
  }
  if (expiresAt <= now) expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  // Upsert token — one per application+event (replace if re-sending)
  const { data: tokenRow, error: tokenErr } = await supabase
    .from('rsvp_tokens')
    .upsert({
      application_id: applicationId,
      event_name: eventName,
      expires_at: expiresAt.toISOString(),
      confirmed_at: null,
      answers: null,
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
          ? `Hey ${firstName},\n\nJust a reminder — your invitation to ${eventName} is still open. Confirm your spot here:\n${rsvpUrl}\n\nThis link expires ${expiresAt.toLocaleDateString('en-CA', { month: 'long', day: 'numeric' })}.\n\n${textSignoff},\nJerry`
          : `Hey ${firstName},\n\nYou're invited to ${eventName}. Confirm your spot here:\n${rsvpUrl}\n\nThis link expires ${expiresAt.toLocaleDateString('en-CA', { month: 'long', day: 'numeric' })}.\n\n${textSignoff},\nJerry`,
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
