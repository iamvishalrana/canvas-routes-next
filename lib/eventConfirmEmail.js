const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'

function googleCalUrl({ eventName, date, location }) {
  if (!date) return null
  // Google Calendar expects YYYYMMDD for all-day events
  const d = date.replace(/-/g, '')
  const nextDay = (() => {
    const dt = new Date(`${date}T12:00:00Z`)
    dt.setUTCDate(dt.getUTCDate() + 1)
    return dt.toISOString().slice(0, 10).replace(/-/g, '')
  })()
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
    <tr><td style="padding-top:16px;padding-bottom:0;border-top:1px solid rgba(197,168,130,0.1);">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;">${label}</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#F5F1EC;">${value}</div>
    </td></tr>` : ''

  const calendarButtons = (icalUrl || gCalUrl) ? `
      <tr><td style="padding-bottom:32px;">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(197,168,130,0.6);margin-bottom:12px;">Add to calendar</div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${icalUrl ? `<td style="padding-right:10px;">
              <a href="${icalUrl}" style="display:inline-block;padding:11px 20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;text-decoration:none;border:1px solid rgba(197,168,130,0.35);">Apple / Outlook</a>
            </td>` : ''}
            ${gCalUrl ? `<td>
              <a href="${gCalUrl}" style="display:inline-block;padding:11px 20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;text-decoration:none;border:1px solid rgba(197,168,130,0.35);">Google Calendar</a>
            </td>` : ''}
          </tr>
        </table>
      </td></tr>` : ''

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#0F1E14;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F1E14;">
  <tr><td align="center" style="padding:48px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;">

      <tr><td style="padding-bottom:32px;"><img src="${SITE}/canvas_routes_refined.png" alt="Canvas Routes" width="200" style="display:block;width:200px;height:auto;border:0;"/></td></tr>
      <tr><td style="padding-bottom:28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background-color:#c5a882;">&nbsp;</td></tr></table></td></tr>
      <tr><td style="padding-bottom:14px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;">Canvas Routes &middot; Event Registration &middot; Confirmed</td></tr>

      <tr><td style="padding-bottom:20px;font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:300;line-height:1.2;color:#F5F1EC;">
        You&rsquo;re in, ${firstName}.
      </td></tr>

      <tr><td style="padding-bottom:32px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.8;color:rgba(245,241,236,0.8);">
        Your spot at <strong style="color:#F5F1EC;font-weight:400;">${eventName}</strong> is confirmed. We&rsquo;ll be in touch with any details as the date gets closer.
      </td></tr>

      <tr><td style="padding-bottom:32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:rgba(197,168,130,0.06);border:0.5px solid rgba(197,168,130,0.18);">
          <tr><td style="padding:24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="padding-bottom:16px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;">Event</div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#F5F1EC;">${eventName}</div>
              </td></tr>
              ${detailRow('Date', dateLabel)}
              ${detailRow('Location', location)}
              ${detailRow('Payment', amountStr)}
            </table>
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="padding-bottom:32px;" align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="background-color:#c5a882;">
            <a href="${SITE}/members/events" style="display:inline-block;padding:16px 40px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#0F1E14;text-decoration:none;font-weight:600;">View My Events &rarr;</a>
          </td></tr>
        </table>
      </td></tr>

      ${calendarButtons}

      <tr><td style="padding-bottom:32px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:rgba(245,241,236,0.6);">
        Questions? Reply directly to this email &mdash; it comes straight to me.<br/><br/>
        <span style="color:rgba(245,241,236,0.45);">&mdash; Jerry</span>
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
