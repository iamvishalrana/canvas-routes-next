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

// Light/beige throughout — no dark green band — since logo-color.png (the
// normal branded logo) only reads clearly on a light background; the
// white-outline.png variant every other transactional email in lib/*Email.js
// uses is specifically the dark-background version and would be invisible
// here on purpose, not a mistake to copy from those templates.
function otpEmailHtml({ firstName, code }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Canvas Routes Gallery Code</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;">
    <tr><td align="center" style="padding:32px 16px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">
        <tr><td style="background:#ffffff;border:1px solid rgba(15,30,20,0.08);padding:40px 40px 32px;">
          <img src="https://canvasroutes.com/logo-color.png" alt="Canvas Routes" width="150" style="display:block;width:150px;height:auto;border:0;outline:0;margin-bottom:24px;" />
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin-bottom:20px;"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background:#c5a882;">&nbsp;</td></tr></table>
          <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#8A6535;">Canvas Routes &middot; Private Gallery</p>
          <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:300;line-height:1.2;color:#1a1a1a;">Hi ${h(firstName)},</h1>
          <p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#555;">Here's your verification code to view your Canvas Routes photos. It expires in 10 minutes.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="background:#F5F1EC;border:1px solid rgba(197,168,130,0.5);padding:16px 32px;">
              <span style="font-family:Arial,Helvetica,sans-serif;font-size:32px;font-weight:700;letter-spacing:8px;color:#0F1E14;">${h(code)}</span>
            </td></tr>
          </table>
          <p style="margin:28px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:1.7;color:#999;">Didn't request this? You can safely ignore this email — nobody can view your photos without this code.</p>
        </td></tr>
        <tr><td style="background:#EDE8E1;padding:16px 40px;">
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8a8378;">&copy; 2026 Canvas Routes Events Inc. &mdash; Montreal, QC. &nbsp;&middot;&nbsp; <a href="https://canvasroutes.com" style="color:#8A6535;text-decoration:none;">canvasroutes.com</a></p>
        </td></tr>
      </table>
    </td></tr>
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
  if (await checkRateLimit(ip, 8, 60, 'gallery-request-code')) {
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
