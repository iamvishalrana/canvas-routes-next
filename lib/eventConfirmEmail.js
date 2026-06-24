const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'

function googleCalUrl({ eventName, date, location }) {
  if (!date) return null
  // Supabase DATE columns return YYYY-MM-DD; strip any time component that may sneak in
  const isoDate = typeof date === 'string' ? date.slice(0, 10) : String(date).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null

  const d = isoDate.replace(/-/g, '')
  const dt = new Date(`${isoDate}T12:00:00Z`)
  if (isNaN(dt.getTime())) return null
  dt.setUTCDate(dt.getUTCDate() + 1)
  const nextDay = dt.toISOString().slice(0, 10).replace(/-/g, '')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventName,
    dates: `${d}/${nextDay}`,
    details: `Canvas Routes Event — ${SITE}/members/events`,
    ...(location ? { location } : {}),
    sf: 'true',
    output: 'xml',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function buildEventConfirmHtml({ firstName, eventName, dateDisplay, location, isFree, amountPaid, eventId, date }) {
  const dateLabel = dateDisplay || null
  const amountStr = isFree ? 'Free' : amountPaid > 0 ? `$${(amountPaid / 100).toFixed(2)} CAD` : null
  const icalUrl = eventId ? `${SITE}/api/events/${eventId}/ical` : null
  const gCalUrl = googleCalUrl({ eventName, date, location })

  const detailRow = (label, value) => value ? `
    <tr><td style="padding-top:14px;border-top:1px solid rgba(0,0,0,0.06);">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;">${label}</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#333;">${value}</div>
    </td></tr>` : ''

  const calendarButtons = (icalUrl || gCalUrl) ? `
      <div style="margin-bottom:24px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#aaa;margin-bottom:10px;">Add to calendar</div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${icalUrl ? `<td style="padding-right:8px;">
              <a href="${icalUrl}" style="display:inline-block;padding:10px 18px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#555;text-decoration:none;border:0.5px solid rgba(0,0,0,0.18);">Apple / Outlook</a>
            </td>` : ''}
            ${gCalUrl ? `<td>
              <a href="${gCalUrl}" style="display:inline-block;padding:10px 18px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#555;text-decoration:none;border:0.5px solid rgba(0,0,0,0.18);">Google Calendar</a>
            </td>` : ''}
          </tr>
        </table>
      </div>` : ''

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;">
  <tr><td align="center" style="padding:32px 16px 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">

      <!-- Header -->
      <tr><td style="background:#0F1E14;padding:32px 40px 28px;">
        <img src="${SITE}/canvas_routes_refined.png" alt="Canvas Routes" width="150" style="display:block;width:150px;height:auto;border:0;margin-bottom:24px;opacity:0.92;"/>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin-bottom:20px;"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background:#c5a882;">&nbsp;</td></tr></table>
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;">Canvas Routes &middot; Event Registration &middot; Confirmed</p>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:300;line-height:1.2;color:#F5F1EC;">You&rsquo;re in, ${firstName}.</h1>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:#ffffff;padding:36px 40px 32px;">
        <p style="margin:0 0 1.4em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">Your spot at <strong style="color:#1a1a1a;font-weight:500;">${eventName}</strong> is confirmed. We&rsquo;ll be in touch with any details as the date gets closer.</p>

        <!-- Detail card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;border-left:3px solid #c5a882;margin-bottom:28px;">
          <tr><td style="padding:18px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="padding-bottom:12px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;">Event</div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;">${eventName}</div>
              </td></tr>
              ${detailRow('Date', dateLabel)}
              ${detailRow('Location', location)}
              ${detailRow('Payment', amountStr)}
            </table>
          </td></tr>
        </table>

        <!-- CTA -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          <tr><td style="background:#0F1E14;">
            <a href="${SITE}/members/events" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#F5F1EC;text-decoration:none;font-weight:600;">View My Events &rarr;</a>
          </td></tr>
        </table>

        ${calendarButtons}

        <p style="margin:0 0 1em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:#555;">Questions? Reply directly to this email &mdash; it comes straight to me.</p>
        <p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#888;">&mdash; Jerry</p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="border:0.5px solid rgba(0,0,0,0.18);">
            <a href="https://www.instagram.com/canvasroutes" style="display:inline-block;padding:11px 22px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#555;text-decoration:none;">Follow &#64;canvasroutes &rarr;</a>
          </td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#0F1E14;padding:16px 40px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(245,241,236,0.3);line-height:1.6;">
          &copy; 2026 Canvas Routes. Montreal, QC. &nbsp;&middot;&nbsp;
          <a href="${SITE}" style="color:rgba(197,168,130,0.4);text-decoration:none;">canvasroutes.com</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`
}
