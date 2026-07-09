const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'

function shell({ eyebrow, heading, bodyHtml }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;">
  <tr><td align="center" style="padding:32px 16px 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">
      <tr><td style="background:#0F1E14;padding:32px 40px 28px;">
        <img src="${SITE}/canvas_routes_refined.png" alt="Canvas Routes" width="150" style="display:block;width:150px;height:auto;border:0;margin-bottom:24px;opacity:0.92;"/>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin-bottom:20px;"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background:#c5a882;">&nbsp;</td></tr></table>
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;">${eyebrow}</p>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:300;line-height:1.2;color:#F5F1EC;">${heading}</h1>
      </td></tr>
      <tr><td style="background:#ffffff;padding:36px 40px 32px;">
        ${bodyHtml}
      </td></tr>
      <tr><td style="background:#0F1E14;padding:22px 40px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:1px;color:rgba(245,241,236,0.4);">© 2026 Canvas Routes Inc. — Montreal, QC</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

// Sent to a visitor right after they express interest in a route.
export function buildRouteInterestHtml({ firstName, routeName, monthLabel }) {
  return shell({
    eyebrow: 'Canvas Routes &middot; Upcoming Journeys',
    heading: `You&rsquo;re on the list${firstName ? `, ${firstName}` : ''}.`,
    bodyHtml: `
        <p style="margin:0 0 1.4em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">Thanks for registering your interest in <strong style="color:#1a1a1a;font-weight:500;">${routeName}</strong>${monthLabel ? ` &mdash; ${monthLabel}` : ''}.</p>
        <p style="margin:0 0 1.4em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">This route launches once enough drivers are in. The moment we hit the crew we need, you&rsquo;ll get an email with the full details &mdash; meeting point, the route, convoy rules, and how to lock in your spot.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;border-left:3px solid #c5a882;margin-bottom:28px;">
          <tr><td style="padding:18px 20px;">
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.7;color:#555;"><strong style="color:#1a1a1a;font-weight:500;">Members get priority spots</strong> and early launch notifications on every route.</p>
          </td></tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td><a href="${SITE}/membership" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#F5F1EC;text-decoration:none;font-weight:600;background:#45643c;">Become a Member &rarr;</a></td></tr>
        </table>`,
  })
}

function esc(s) { return String(s || '').replace(/</g, '&lt;') }

function detailRows({ pricePerCar, maxCars, itinerary }) {
  const rows = []
  if (pricePerCar != null && pricePerCar !== '') rows.push(['Per-car fee', `$${Number(pricePerCar).toFixed(2)}`])
  if (maxCars) rows.push(['Cars', `${maxCars} max`])
  let html = ''
  if (rows.length) {
    html += `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:0.5px solid rgba(0,0,0,0.1);margin-bottom:24px;">${rows.map(([k, v]) => `<tr><td style="padding:12px 16px;border-bottom:0.5px solid rgba(0,0,0,0.06);font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#999;width:120px;">${k}</td><td style="padding:12px 16px;border-bottom:0.5px solid rgba(0,0,0,0.06);font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#1a1a1a;">${esc(v)}</td></tr>`).join('')}</table>`
  }
  const itin = (itinerary || '').trim()
  if (itin) {
    html += `<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;">Itinerary</p><p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.8;color:#444;white-space:pre-wrap;">${esc(itin)}</p>`
  }
  return html
}

// Sent to every interested driver when an admin launches the route.
export function buildRouteLaunchHtml({ firstName, routeName, monthLabel, destination, message, pricePerCar, maxCars, itinerary }) {
  const note = (message || '').trim()
  return shell({
    eyebrow: 'Canvas Routes &middot; Route Launched',
    heading: `${routeName} is a go.`,
    bodyHtml: `
        <p style="margin:0 0 1.4em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">${firstName ? `${firstName}, we` : 'We'} hit the crew we needed &mdash; <strong style="color:#1a1a1a;font-weight:500;">${routeName}</strong>${destination ? ` to ${destination}` : ''}${monthLabel ? `, ${monthLabel},` : ''} is officially launching.</p>
        ${note ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;border-left:3px solid #c5a882;margin-bottom:28px;"><tr><td style="padding:18px 20px;"><p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.75;color:#444;white-space:pre-wrap;">${esc(note)}</p></td></tr></table>` : ''}
        ${detailRows({ pricePerCar, maxCars, itinerary })}
        <p style="margin:0 0 1em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:#555;">We&rsquo;ll follow up with the meeting point and convoy rules. Questions? Just reply to this email.</p>`,
  })
}

// Sent when an admin broadcasts an update to everyone interested in a route.
export function buildRouteBroadcastHtml({ firstName, routeName, message }) {
  return shell({
    eyebrow: 'Canvas Routes &middot; Route Update',
    heading: `An update on ${routeName}.`,
    bodyHtml: `
        ${firstName ? `<p style="margin:0 0 1.2em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">Hi ${esc(firstName)},</p>` : ''}
        <p style="margin:0 0 1em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;white-space:pre-wrap;">${esc((message || '').trim())}</p>
        <p style="margin:1.4em 0 0;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.8;color:#888;">You're receiving this because you registered interest in ${esc(routeName)}. Reply anytime.</p>`,
  })
}
