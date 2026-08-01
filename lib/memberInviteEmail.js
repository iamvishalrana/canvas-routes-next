// Shared by both app/api/admin/members/route.js (first invite) and
// app/api/admin/members/[id]/resend-invite/route.js — these used to each
// carry their own separately-hardcoded copy of this template, which had
// drifted into two visually DIFFERENT emails (one beige/white matching the
// site's normal light convention, one fully dark-green) for the exact same
// logical action. A member who missed the first invite and got a resend saw
// a noticeably different-looking email. One shared function now, so there's
// no way for the two sends to disagree again.
function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function buildMemberInviteEmailHtml({ firstName, tier, actionLink }) {
  const tierLabel = tier === 'inner_circle' ? 'Inner Circle' : 'Routes Member'
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're in — Canvas Routes 2026</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;">
  <tr><td align="center" style="padding:32px 16px 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">
      <tr><td style="background:#0F1E14;padding:32px 40px 28px;">
        <img src="https://canvasroutes.com/white-outline.png" alt="Canvas Routes" width="150" style="display:block;width:150px;height:auto;border:0;margin-bottom:24px;opacity:0.92;" />
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin-bottom:20px;"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background:#c5a882;">&nbsp;</td></tr></table>
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;">Canvas Routes &middot; 2026 Season</p>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:300;line-height:1.2;color:#F5F1EC;">Welcome, ${h(firstName)}.</h1>
      </td></tr>
      <tr><td style="background:#ffffff;padding:36px 40px 32px;">
        <p style="margin:0 0 1em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">Your membership is confirmed &mdash; glad to have you with us for the 2026 season.</p>
        <p style="margin:0 0 1.5em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#666;">This is going to be a good one. Scenic routes across Quebec and beyond, morning meets with the right crowd, and a season built around actually driving. We&apos;ll be in touch with everything you need before we hit the road.</p>

        <!-- Membership card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;border-left:3px solid #c5a882;margin-bottom:28px;">
          <tr><td style="padding:18px 20px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;">Season</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;margin-bottom:14px;">June &mdash; ${tier === 'inner_circle' ? 'November' : 'October'} 2026</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;border-top:1px solid rgba(0,0,0,0.06);padding-top:14px;">Your membership</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;">${tierLabel}</div>
          </td></tr>
        </table>

        <!-- CTA -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
          <tr><td style="background:#0F1E14;">
            <a href="${h(actionLink)}" style="display:block;padding:15px 32px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#F5F1EC;text-decoration:none;font-weight:600;text-align:center;">Set up your account &rarr;</a>
          </td></tr>
        </table>

        <p style="margin:0 0 0.5em;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.8;color:#666;">See you on the road.<br/><span style="color:#aaa;">Jerry</span></p>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#bbb;">The setup link expires in 7 days. Questions? Reply here or reach us at <a href="mailto:info@canvasroutes.com" style="color:#888;text-decoration:none;">info@canvasroutes.com</a>.</p>
      </td></tr>
      <tr><td style="background:#0F1E14;padding:16px 40px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(245,241,236,0.3);">&copy; 2026 Canvas Routes. Montreal, QC.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

export function memberInviteEmailText({ firstName, actionLink }) {
  return `Hey ${firstName},\n\nYou're in — welcome to Canvas Routes.\n\nSet up your member portal here:\n${actionLink}\n\nSee you on the road,\nJerry\nCanvas Routes`
}
