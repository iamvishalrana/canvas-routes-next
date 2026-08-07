// Shared membership "application received" email — used by both the normal
// flow (app/api/membership-waitlist) and the webhook rescue path
// (app/api/stripe/webhook, requires_capture handler). Keeping one source means
// the applicant gets the identical email no matter which path wins the race.

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// tier accepts either the label ('Routes Member' / 'Inner Circle') or the
// stripe type ('membership_inner_circle' / 'membership_routes'); anything that
// isn't Inner Circle falls back to Routes Member.
function tierLabelOf(tier) {
  return tier === 'Inner Circle' || tier === 'membership_inner_circle'
    ? 'Inner Circle'
    : 'Routes Member'
}

export function buildMembershipConfirmHtml(rawFirstName, tier) {
  const firstName = h(rawFirstName)
  const tierLabel = tierLabelOf(tier)
  const step = (num, title, body) => `
    <tr><td style="padding-bottom:18px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="26" style="width:26px;vertical-align:top;padding-top:1px;">
            <div style="width:20px;height:20px;background:#0F1E14;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#c5a882;text-align:center;line-height:20px;">${num}</div>
          </td>
          <td style="vertical-align:top;padding-left:12px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:3px;">${title}</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#666;line-height:1.65;">${body}</div>
          </td>
        </tr>
      </table>
    </td></tr>`

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Application received — Canvas Routes</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;">
  <tr><td align="center" style="padding:32px 16px 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">

      <!-- Header -->
      <tr><td style="background:#0F1E14;padding:32px 40px 28px;">
        <img src="https://canvasroutes.com/white-outline.png" alt="Canvas Routes" width="150" style="display:block;width:150px;height:auto;border:0;margin-bottom:24px;opacity:0.92;" />
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin-bottom:20px;"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background:#c5a882;">&nbsp;</td></tr></table>
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;">Canvas Routes &middot; ${tierLabel} &middot; 2026 Season</p>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:300;line-height:1.2;color:#F5F1EC;">We&apos;ve got you, ${firstName}.</h1>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:#ffffff;padding:36px 40px 32px;">
        <p style="margin:0 0 1em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">Your application for the 2026 Canvas Routes season is in. Your payment has been <strong style="color:#1a1a1a;font-weight:500;">authorised and held</strong> &mdash; your card has not been charged yet.</p>
        <p style="margin:0 0 1.5em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">We go through every application personally. Here&apos;s exactly what happens from here.</p>

        <!-- Steps card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;border-left:3px solid #c5a882;margin-bottom:24px;">
          <tr><td style="padding:20px 22px 4px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;margin-bottom:18px;">What happens next</div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${step('1', 'We review your application', 'Every application is looked at personally. We keep the community intentional — this typically takes a few days.')}
              ${step('2', 'You hear from Jerry directly', 'Expect an email from <a href="mailto:jerry@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">jerry@canvasroutes.com</a>. Add that address to your contacts now so it doesn\'t get missed.')}
              ${step('3', 'If approved — welcome to the community', 'Your payment is captured and you\'ll receive everything you need to get started. Your members kit will be ready to collect at your first event.')}
              ${step('4', 'If not approved — nothing is charged', 'Your authorisation hold is released in full. No charge, no questions asked.')}
            </table>
          </td></tr>
        </table>

        <p style="margin:0 0 1em;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#999;">Our reply will come from <a href="mailto:jerry@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">jerry@canvasroutes.com</a>. If you don&apos;t hear from us within a few days, please check your <strong style="font-weight:500;color:#666;">junk or spam folder</strong>.</p>
        <p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.8;color:#aaa;">If you were referred by an existing member, that&apos;s noted and taken into account during review.</p>

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
          <a href="https://canvasroutes.com" style="color:rgba(197,168,130,0.4);text-decoration:none;">canvasroutes.com</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

// Plain-text counterpart, kept in sync with the HTML above.
export function buildMembershipConfirmText(rawFirstName) {
  const firstName = rawFirstName || 'there'
  return `We've got you, ${firstName}.\n\nYour application for the 2026 Canvas Routes season is in. Your payment has been authorised and held — your card has not been charged yet.\n\nWhat happens next:\n1. We review your application — every application is looked at personally, typically within a few days.\n2. You'll hear from Jerry directly at jerry@canvasroutes.com — add that address to your contacts now.\n3. If approved, your payment is captured and you're in — your members kit will be ready to collect at your first event.\n4. If not approved, your authorisation hold is released in full — no charge, no questions asked.\n\nIf you don't hear from us within a few days, please check your junk or spam folder.\n\nFollow @canvasroutes on Instagram: https://www.instagram.com/canvasroutes\n\n© 2026 Canvas Routes. Montreal, QC.`
}
