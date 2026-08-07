// Standard admin notification email — matches the RSVP confirmed email style.
// label: short uppercase string shown at top, e.g. "New registration"
// rows:  array of [label, value] pairs — null/empty values are skipped

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif"

export function buildAdminNotifyHtml(label, rows) {
  const rowHtml = rows.map(([lbl, val]) => {
    if (val == null || val === '') return ''
    return `<tr>
      <td width="150" style="width:150px;padding:10px 14px 10px 0;border-bottom:1px solid #EFEFEF;font-family:${FONT};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#9A9A9A;vertical-align:top;">${lbl}</td>
      <td style="padding:10px 0;border-bottom:1px solid #EFEFEF;font-family:${FONT};font-size:14px;color:#161616;vertical-align:top;">${val}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/></head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F1EC;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="540" style="max-width:540px;width:100%;background:#ffffff;border-radius:14px;">
      <tr><td style="padding:28px 28px 8px;">
        <div style="display:inline-block;padding:6px 12px;background:#0F1E14;border-radius:6px;font-family:${FONT};font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#C5A882;">${label}</div>
      </td></tr>
      <tr><td style="padding:12px 28px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${rowHtml}
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}
