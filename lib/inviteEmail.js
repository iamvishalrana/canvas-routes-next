const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'

export function buildInviteHtml(firstName, eventName, eventDate, eventLocation, rsvpUrl, expiresAt, isRoadTrip, isResend = false) {
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
        ? `Just a quick reminder &mdash; your invitation to join us for <strong style="color:#1a1a1a;font-weight:500;">${eventName}</strong> is still open. Check in below before the link expires.`
        : `Just a quick reminder &mdash; your spot at <strong style="color:#1a1a1a;font-weight:500;">${eventName}</strong> is still available. One click and you&rsquo;re confirmed.`)
    : (isRoadTrip
        ? `We&rsquo;ve reviewed your application and we&rsquo;d love to have you on the road with us for <strong style="color:#1a1a1a;font-weight:500;">${eventName}</strong>. Check in below &mdash; it takes 30 seconds and helps us plan the day around everyone coming.`
        : `We&rsquo;ve reviewed your application and we&rsquo;d love to see you at <strong style="color:#1a1a1a;font-weight:500;">${eventName}</strong>. One click to confirm and you&rsquo;re in.`)

  const signoff = isRoadTrip
    ? `Questions about the route? Reply directly to this email &mdash; it comes straight to me.`
    : `Questions? Reply directly to this email &mdash; it comes straight to me.`

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>You&rsquo;re invited &mdash; Canvas Routes</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;">
  <tr><td align="center" style="padding:32px 16px 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">

      <!-- ── Dark green header ─────────────────────────────────────── -->
      <tr><td style="background:#0F1E14;padding:36px 40px 32px;">
        <img src="${SITE}/canvas_routes_refined.png" alt="Canvas Routes" width="150" style="display:block;width:150px;height:auto;border:0;margin-bottom:28px;opacity:0.92;" />
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin-bottom:24px;">
          <tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background:#c5a882;">&nbsp;</td></tr>
        </table>
        <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;">${label}</p>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:34px;font-weight:300;line-height:1.2;color:#F5F1EC;">${headline}</h1>
      </td></tr>

      <!-- ── White body ────────────────────────────────────────────── -->
      <tr><td style="background:#ffffff;padding:36px 40px 32px;">

        <p style="margin:0 0 1.4em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">${body}</p>

        <!-- Event detail card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;border-left:3px solid #c5a882;margin-bottom:28px;">
          <tr><td style="padding:20px 22px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="padding-bottom:${dateLabel || eventLocation ? '14px' : '0'};${dateLabel || eventLocation ? 'border-bottom:1px solid rgba(0,0,0,0.06);' : ''}">
                <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;">${isRoadTrip ? 'Route' : 'Event'}</p>
                <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;">${eventName}</p>
              </td></tr>
              ${dateLabel ? `<tr><td style="padding-top:14px;${eventLocation ? 'padding-bottom:14px;border-bottom:1px solid rgba(0,0,0,0.06);' : ''}">
                <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;">Date</p>
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#333;">${dateLabel}</p>
              </td></tr>` : ''}
              ${eventLocation ? `<tr><td style="padding-top:14px;">
                <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;">${isRoadTrip ? 'Departure Point' : 'Location'}</p>
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#333;">${eventLocation}</p>
              </td></tr>` : ''}
            </table>
          </td></tr>
        </table>

        <!-- CTA button -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          <tr><td style="background:#0F1E14;">
            <a href="${rsvpUrl}" style="display:inline-block;padding:15px 36px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#F5F1EC;text-decoration:none;font-weight:600;">Check In &rarr;</a>
          </td></tr>
        </table>

        <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#aaa;">
          This link expires on <strong style="color:#888;">${expiry}</strong>. If it expires before you can confirm, reply to this email and we&rsquo;ll sort it out.
        </p>

        <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#555;">${signoff}</p>
        <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#555;">&mdash; Jerry</p>

      </td></tr>

      <!-- ── Instagram strip ───────────────────────────────────────── -->
      <tr><td style="background:#EDE8E1;padding:20px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="border:0.5px solid rgba(0,0,0,0.18);">
            <a href="https://www.instagram.com/canvasroutes" style="display:inline-block;padding:11px 24px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#555;text-decoration:none;">Follow &#64;canvasroutes &rarr;</a>
          </td></tr>
        </table>
      </td></tr>

      <!-- ── Footer ────────────────────────────────────────────────── -->
      <tr><td style="background:#0F1E14;padding:18px 40px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(245,241,236,0.3);line-height:1.6;">
          &copy; 2026 Canvas Routes &nbsp;&middot;&nbsp; Montreal, QC &nbsp;&middot;&nbsp;
          <a href="${SITE}" style="color:rgba(197,168,130,0.4);text-decoration:none;">canvasroutes.com</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`
}
