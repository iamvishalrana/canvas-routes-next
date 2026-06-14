import { requireAdmin } from '../../../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../../lib/sentry'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'

function buildInviteHtml(firstName, eventName, eventDate, eventLocation, rsvpUrl, expiresAt, isRoadTrip) {
  const expiry = new Date(expiresAt).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
  const dateLabel = eventDate
    ? new Date(eventDate).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null
  const label = isRoadTrip ? 'Canvas Routes &middot; Road Trip &middot; You&rsquo;re Invited'
                           : 'Canvas Routes &middot; Car Meet &middot; You&rsquo;re Invited'
  const headline = isRoadTrip ? `The road is calling, ${firstName}.` : `Your spot&rsquo;s ready, ${firstName}.`
  const body = isRoadTrip
    ? `We&rsquo;ve reviewed your application and we&rsquo;d love to have you on the road with us for <strong style="color:#F5F1EC;font-weight:400;">${eventName}</strong>. Confirm your spot below &mdash; we&rsquo;ll follow up with full route details as the date gets closer.`
    : `We&rsquo;ve reviewed your application and we&rsquo;d love to see you at <strong style="color:#F5F1EC;font-weight:400;">${eventName}</strong>. Answer a few quick questions and you&rsquo;re in.`
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
      <tr><td style="padding-bottom:32px;"><img src="${SITE}/canvas_routes_refined.png" alt="Canvas Routes" width="200" style="display:block;width:200px;height:auto;border:0;" /></td></tr>
      <tr><td style="padding-bottom:28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background-color:#c5a882;">&nbsp;</td></tr></table></td></tr>
      <tr><td style="padding-bottom:14px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;">${label}</td></tr>
      <tr><td style="padding-bottom:20px;font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:300;line-height:1.2;color:#F5F1EC;">${headline}</td></tr>
      <tr><td style="padding-bottom:32px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.8;color:rgba(245,241,236,0.8);">${body}</td></tr>
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
          <tr><td style="border:1px solid rgba(197,168,130,0.5);">
            <a href="${rsvpUrl}" style="display:inline-block;padding:16px 40px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#c5a882;text-decoration:none;font-weight:600;">Confirm My Spot &rarr;</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding-bottom:28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:rgba(245,241,236,0.45);">
        This link expires on <strong style="color:rgba(245,241,236,0.6);">${expiry}</strong>. If it expires before you can confirm, reply to this email and we&rsquo;ll sort it out.
      </td></tr>
      <tr><td style="padding-bottom:32px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:rgba(245,241,236,0.6);">
        ${signoff}<br/><br/><span style="color:rgba(245,241,236,0.45);">&mdash; Jerry</span>
      </td></tr>
      <tr><td style="padding-bottom:28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border:1px solid rgba(197,168,130,0.35);"><a href="https://www.instagram.com/canvasroutes" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;text-decoration:none;">Follow &#64;canvasroutes &rarr;</a></td></tr></table></td></tr>
      <tr><td style="padding-top:20px;border-top:1px solid rgba(197,168,130,0.12);font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(245,241,236,0.3);line-height:1.8;">
        &copy; 2026 Canvas Routes. Montreal, QC.<br/>
        <a href="${SITE}" style="color:rgba(197,168,130,0.4);text-decoration:none;">canvasroutes.com</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { email, name } = await request.json().catch(() => ({}))

  if (!email?.trim() || !name?.trim()) {
    return Response.json({ error: 'Email and name are required.' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'Email not configured.' }, { status: 503 })
  }

  const admin = createAdminClient()

  const [{ data: ev }, { data: app }] = await Promise.all([
    admin.from('events').select('id, name, date, date_display, location, type').eq('id', id).single(),
    admin.from('applications').select('id').eq('email', email.toLowerCase().trim()).maybeSingle(),
  ])

  if (!ev) return Response.json({ error: 'Event not found.' }, { status: 404 })
  if (!app) return Response.json({ error: 'No application found for this email. Add them as a registrant first.' }, { status: 404 })

  const isRoadTrip = ev.type === 'Road Trip'
  const now = new Date()
  let expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  if (ev.date) {
    const evDate = new Date(ev.date)
    const cutoff = new Date(evDate.getTime() - 48 * 60 * 60 * 1000)
    if (cutoff < expiresAt) expiresAt = cutoff
  }
  if (expiresAt <= now) expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  // Preserve confirmed_at and answers if already set — re-sending must not un-confirm
  const { data: existingToken } = await admin
    .from('rsvp_tokens')
    .select('confirmed_at, answers')
    .eq('application_id', app.id)
    .eq('event_name', ev.name)
    .maybeSingle()

  const { data: tokenRow, error: tokenErr } = await admin
    .from('rsvp_tokens')
    .upsert({
      application_id: app.id,
      event_name: ev.name,
      expires_at: expiresAt.toISOString(),
      confirmed_at: existingToken?.confirmed_at ?? null,
      answers: existingToken?.answers ?? null,
      declined_at: null,
    }, { onConflict: 'application_id,event_name', ignoreDuplicates: false })
    .select('token')
    .single()

  if (tokenErr || !tokenRow) {
    captureException(tokenErr, { context: 'admin-registrant-invite-token', appId: app.id, eventId: id })
    return Response.json({ error: 'Failed to create invitation link.' }, { status: 500 })
  }

  const firstName = name.trim().split(' ')[0]
  const rsvpUrl = `${SITE}/rsvp/${tokenRow.token}`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <jerry@canvasroutes.com>',
        to: email.trim(),
        reply_to: 'jerry@canvasroutes.com',
        subject: `You're invited — ${ev.name}`,
        html: buildInviteHtml(firstName, ev.name, ev.date, ev.location, rsvpUrl, expiresAt.toISOString(), isRoadTrip),
        text: `Hey ${firstName},\n\nYou're invited to ${ev.name}. Confirm your spot here:\n${rsvpUrl}\n\nThis link expires ${expiresAt.toLocaleDateString('en-CA', { month: 'long', day: 'numeric' })}.\n\nSee you there,\nJerry`,
      }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      return Response.json({ error: d.message || `Resend error ${res.status}` }, { status: 502 })
    }
    return Response.json({ success: true })
  } catch (err) {
    captureException(err, { context: 'admin-registrant-invite-email', email, eventId: id })
    return Response.json({ error: 'Failed to send email.' }, { status: 500 })
  }
}
