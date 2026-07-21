function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Sent once a registrant's check-in is fully complete (whichever of trip
// details / waiver / lunch are enabled for the event) — includes a copy of
// their signed waiver for their records and lets them know the itinerary
// comes later, closer to the date, rather than immediately. The waiver copy
// always includes both English and French text (whichever the event has on
// file), matching the check-in page's own bilingual waiver display.
export function buildCheckinCompleteHtml(firstName, eventName, waiver) {
  const vehicle = [waiver?.vehicle?.year, waiver?.vehicle?.make, waiver?.vehicle?.model].filter(Boolean).join(' ') || '—'
  const signedAt = waiver?.signed_at
    ? new Date(waiver.signed_at).toLocaleString('en-CA', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' })
    : '—'
  const passengerLines = (waiver?.passengers || []).map(p => `${p.name}, age ${p.age}`).join('<br/>') || 'None listed'

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;">
  <tr><td align="center" style="padding:32px 16px 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">
      <tr><td style="background:#0F1E14;padding:32px 40px 28px;">
        <img src="https://canvasroutes.com/white-outline.png" alt="Canvas Routes" width="150" style="display:block;width:150px;height:auto;border:0;margin-bottom:24px;opacity:0.92;" />
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin-bottom:20px;"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background:#c5a882;">&nbsp;</td></tr></table>
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;">Canvas Routes &middot; Check-in</p>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:300;line-height:1.2;color:#F5F1EC;">You&apos;re all set, ${firstName}.</h1>
      </td></tr>
      <tr><td style="background:#ffffff;padding:36px 40px 32px;">
        <p style="margin:0 0 1.4em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">Your check-in for <strong style="color:#1a1a1a;font-weight:500;">${eventName}</strong> is complete — trip details, waiver, and lunch are all on file.</p>

        <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#666;">The full itinerary — meeting point, timing, and everything else — will be shared with you a few days before the day of the route.</p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#EDE8E1;border-left:3px solid #c5a882;margin-bottom:20px;">
          <tr><td style="padding:20px 22px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;">Your Signed Waiver</div>
            <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:19px;color:#1a1a1a;margin:10px 0 6px;">${waiver?.full_name || firstName}</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#666;line-height:1.9;">
              Signed ${signedAt}<br/>
              Vehicle: ${vehicle}<br/>
              Emergency contact: ${waiver?.emergency_contact?.name || '—'} &middot; ${waiver?.emergency_contact?.phone || '—'}<br/>
              Passengers covered: ${passengerLines}
            </div>
          </td></tr>
        </table>

        ${waiver?.waiver_text_snapshot ? `
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#999;margin-bottom:8px;">Full Waiver Text — For Your Records${waiver?.waiver_text_snapshot_fr ? ' (French version follows below)' : ''}</div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fafaf9;border:1px solid rgba(0,0,0,0.08);margin-bottom:24px;">
          <tr><td style="padding:16px 18px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#777;white-space:pre-wrap;">${escapeHtml(waiver.waiver_text_snapshot)}</div>
            ${waiver?.waiver_text_snapshot_fr ? `
            <div style="height:1px;background:rgba(0,0,0,0.1);margin:16px 0;"></div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#777;white-space:pre-wrap;">${escapeHtml(waiver.waiver_text_snapshot_fr)}</div>` : ''}
          </td></tr>
        </table>` : ''}

        <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#666;">Keep an eye on <a href="https://www.instagram.com/canvasroutes" style="color:#3B6B2F;text-decoration:none;">@canvasroutes</a> for updates. Reply to this email if anything on file needs correcting.</p>

        <p style="margin:24px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#444;">See you on the road,<br/>Jerry<br/>Canvas Routes</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}
