// Standard admin notification email — matches the RSVP confirmed email style.
// label: short uppercase string shown at top, e.g. "New registration"
// rows:  array of [label, value] pairs — null/empty values are skipped

export function buildAdminNotifyHtml(label, rows) {
  const rowHtml = rows.map(([lbl, val]) => {
    if (val == null || val === '') return ''
    return `<tr>
      <td width="160" style="width:160px;padding:8px 12px 8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#888888;vertical-align:top;">${lbl}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;vertical-align:top;">${val}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/></head>
<body style="margin:0;padding:0;background-color:#ffffff;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px;width:100%;">
      <tr><td style="padding-bottom:20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888888;">${label}</td></tr>
      <tr><td>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${rowHtml}
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}
