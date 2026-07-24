// Shared by every "plain, personal-looking" broadcast email — the main
// Broadcasts tool (app/admin/broadcasts/BroadcastsClient.jsx, built
// client-side) and the route-interest broadcast (lib/roadtripEmail.js, built
// server-side). One copy so the signature can't drift between the two send
// paths the way the unsubscribe headers once did (see lib/emailUnsubscribe.js).
export const EMAIL_SIGNATURE_HTML = `
<table cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
  <tr>
    <td style="vertical-align:middle;padding-right:14px;">
      <img src="https://canvasroutes.com/logo-color.png" width="78" height="30" border="0" style="display:block;" alt="Canvas Routes"/>
    </td>
    <td style="vertical-align:middle;padding-left:14px;border-left:1px solid #e8e8e8;">
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:2px;">Jerry</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#888;margin-bottom:4px;">Founder, Canvas Routes</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#aaa;">
        <a href="https://canvasroutes.com" style="color:#8A6535;text-decoration:none;">canvasroutes.com</a>
        <span style="color:#ddd;margin:0 5px;">|</span>
        <a href="https://instagram.com/canvasroutes" style="color:#8A6535;text-decoration:none;">@canvasroutes</a>
      </div>
    </td>
  </tr>
</table>`

// Plain white-background shell, no boxed/branded header-footer band — used
// wherever an admin is writing a personal-feeling message (the main
// Broadcasts tool, route-update broadcasts). Distinct from roadtripEmail.js's
// `shell()`, which is intentionally branded/boxed for official transactional
// sends (route launch, interest confirmation) where that framing still fits.
export function buildPlainEmailShell(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;">
      <tr>
        <td style="padding:28px 24px 4px;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#333;">${bodyHtml}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 4px;">
          ${EMAIL_SIGNATURE_HTML}
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 32px;">
          <!-- UNSUBSCRIBE_FOOTER -->
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}
