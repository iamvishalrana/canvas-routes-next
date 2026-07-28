import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { captureException, captureMessage } from '../../../../../../lib/sentry'
import { checkRateLimit, getClientIp } from '../../../../../../lib/rateLimit'

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function linkEmailHtml({ firstName, link }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Canvas Routes Photos</title>
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
              Here are your photos from Canvas Routes. Each event's photos are automatically removed 30 days after they're added, so it's worth downloading anything you'd like to keep.
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

// Sends the person's own gallery link to their email — a convenience for the
// admin so they don't have to copy the link and switch to their own email
// client every time a new folder is added.
export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 200, 60)) return Response.json({ error: 'Too many requests' }, { status: 429 })

  const { personId } = await params
  const admin = createAdminClient()
  const { data: person } = await admin.from('photo_share_people').select('name, email, token').eq('id', personId).maybeSingle()
  if (!person) return Response.json({ error: 'Person not found.' }, { status: 404 })

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'Email is not configured (RESEND_API_KEY missing).' }, { status: 503 })
  }

  const firstName = (person.name || person.email).trim().split(' ')[0]
  const link = `${process.env.NEXT_PUBLIC_SITE_URL}/gallery/${person.token}`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Canvas Routes <jerry@canvasroutes.com>',
        to: person.email,
        reply_to: 'jerry@canvasroutes.com',
        subject: 'Your Canvas Routes Photos',
        html: linkEmailHtml({ firstName, link }),
        text: `Hi ${firstName},\n\nHere are your photos from Canvas Routes:\n${link}\n\nEach event's photos are automatically removed 30 days after they're added, so it's worth downloading anything you'd like to keep.\n\nSee you on the road,\nJerry\nCanvas Routes`,
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown')
      captureMessage(`Photo share send-link email failed — ${person.email}`, { response: errText })
      return Response.json({ error: 'Email failed to send. Check Sentry, or copy the link manually.' }, { status: 500 })
    }
  } catch (err) {
    captureException(err, { context: 'photo-share-send-link-email', email: person.email })
    return Response.json({ error: 'Email failed to send. Check Sentry, or copy the link manually.' }, { status: 500 })
  }

  return Response.json({ success: true })
}
