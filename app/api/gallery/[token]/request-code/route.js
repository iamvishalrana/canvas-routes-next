import { after } from 'next/server'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'
import { canSendCode, issueCode } from '../../../../../lib/otp'
import { captureException } from '../../../../../lib/sentry'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function otpEmailHtml({ firstName, code }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Canvas Routes Gallery Code</title>
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
            <td style="padding-bottom:24px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:rgba(245,241,236,0.8);">
              Here's your verification code to view your Canvas Routes photos. It expires in 10 minutes.
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:28px;">
              <div style="display:inline-block;padding:16px 32px;background-color:rgba(197,168,130,0.12);border:1px solid rgba(197,168,130,0.4);font-family:Arial,Helvetica,sans-serif;font-size:32px;font-weight:700;letter-spacing:8px;color:#F5F1EC;">${h(code)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:8px;font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:1.7;color:rgba(245,241,236,0.4);">
              Didn't request this? You can safely ignore this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// Step 1 of the gallery gate: confirms the entered email matches this
// token's recipient (exactly the same check the old single-step "email is
// the password" flow used), then emails a 6-digit code instead of granting
// access outright. Never reveals whether a token exists or what the
// expected email is — a mismatch and a not-found token return the identical
// response, matching the established pattern in this feature.
export async function POST(request, { params }) {
  const { token } = await params
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 8, 60)) {
    return Response.json({ error: 'Too many attempts. Please try again in a minute.' }, { status: 429 })
  }

  const { email } = await request.json().catch(() => ({}))
  const entered = normalizeEmail(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entered)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (!UUID_RE.test(token)) {
    return Response.json({ error: "That email doesn't match this gallery." }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: person } = await admin.from('photo_share_people').select('id, name, email').eq('token', token).maybeSingle()

  const mismatch = () => Response.json({ error: "That email doesn't match this gallery." }, { status: 403 })
  if (!person) return mismatch()
  if (normalizeEmail(person.email) !== entered) return mismatch()

  // Checked before canSendCode so a misconfigured deploy can't burn part of
  // a real visitor's limited resend budget on attempts that were never going
  // to succeed — this is our failure, not theirs, and shouldn't count against them.
  if (!process.env.RESEND_API_KEY) {
    captureException(new Error('RESEND_API_KEY missing for gallery OTP send'), { context: 'gallery-otp-request-code' })
    return Response.json({ error: 'Email delivery is not configured. Please contact info@canvasroutes.com.' }, { status: 503 })
  }

  const allowed = await canSendCode(token, entered)
  if (!allowed) {
    return Response.json({ error: 'Too many codes requested for this gallery. Please wait a few minutes and try again.' }, { status: 429 })
  }

  const code = await issueCode(token, entered)
  const firstName = (person.name || '').trim().split(' ')[0] || 'there'

  after(() =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: person.email,
        subject: `Your code: ${code}`,
        html: otpEmailHtml({ firstName, code }),
      }),
    }).then(res => {
      if (!res.ok) return res.text().then(txt => { throw new Error(`Resend non-200: ${res.status} ${txt}`) })
    }).catch(err => captureException(err, { context: 'gallery-otp-send', token }))
  )

  return Response.json({ ok: true })
}
