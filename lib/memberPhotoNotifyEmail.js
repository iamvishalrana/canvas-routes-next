// Sent from the admin panel's "Notify" button in a member's Car & Personal
// photo folder (app/admin/photos/PhotosClient.jsx) — a manual, one-off
// action, not automatic. Extracted to its own file rather than left inline
// in the route (matching lib/memberInviteEmail.js's convention) since a
// future auto-notify-on-publish flow could reuse the same builder.
function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function buildMemberPhotoNotifyHtml({ firstName, link }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Photos — Canvas Routes</title>
</head>
<body style="margin:0;padding:0;background-color:#0F1E14;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F1E14;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;">
          <tr>
            <td style="padding-bottom:32px;">
              <img src="https://canvasroutes.com/white-outline.png" alt="Canvas Routes" width="200" style="display:block;width:200px;height:auto;border:0;outline:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background-color:#c5a882;">&nbsp;</td></tr></table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:16px;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:300;line-height:1.2;color:#F5F1EC;">
              Hi ${h(firstName)},
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:28px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:rgba(245,241,236,0.8);">
              We've added new photos to your Car &amp; Personal folder in the members portal.
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:28px;">
              <a href="${h(link)}" style="display:inline-block;padding:14px 32px;background-color:#F5F1EC;color:#0F1E14;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;text-decoration:none;">View Your Photos</a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:8px;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.7;color:rgba(245,241,236,0.5);">
              See you on the road,<br />Jerry<br />Canvas Routes
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function memberPhotoNotifyText({ firstName, link }) {
  return `Hi ${firstName},\n\nWe've added new photos to your Car & Personal folder in the members portal:\n${link}\n\nSee you on the road,\nJerry\nCanvas Routes`
}
