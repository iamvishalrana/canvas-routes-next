const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'

export function buildNotifySignupHtml({ firstName }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;">
  <tr><td align="center" style="padding:32px 16px 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">

      <!-- Header -->
      <tr><td style="background:#0F1E14;padding:32px 40px 28px;">
        <img src="${SITE}/logo-white.png" alt="Canvas Routes" width="150" style="display:block;width:150px;height:auto;border:0;margin-bottom:24px;opacity:0.92;"/>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin-bottom:20px;"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background:#c5a882;">&nbsp;</td></tr></table>
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;">Canvas Routes &middot; Event Notifications</p>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:300;line-height:1.2;color:#F5F1EC;">You&rsquo;re on the list${firstName ? `, ${firstName}` : ''}.</h1>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:#ffffff;padding:36px 40px 32px;">
        <p style="margin:0 0 1.4em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">We&rsquo;ll email you when new car meets and routes are announced &mdash; no membership required.</p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;border-left:3px solid #c5a882;margin-bottom:28px;">
          <tr><td style="padding:18px 20px;">
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.7;color:#555;">One thing worth knowing: <strong style="color:#1a1a1a;font-weight:500;">priority for events is always given to Canvas Routes members.</strong> Spots for non-members are limited and go quickly.</p>
          </td></tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
          <tr><td><a href="${SITE}/membership" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#F5F1EC;text-decoration:none;font-weight:600;background:#45643c;">Become a Member &rarr;</a></td></tr>
        </table>

        <p style="margin:0 0 1em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:#555;">Questions? Reply directly to this email.</p>

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
