import { after } from 'next/server'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { canSendCode, issueCode } from '../../../../../../lib/otp'
import { normalizeEmail } from '../../../../../../lib/normalizeEmail'
import { isValidEmail } from '../../../../../../lib/emailValidation'
import { captureException } from '../../../../../../lib/sentry'

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function otpEmailHtml({ code }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirm Your Canvas Routes Admin Recovery Email</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;">
    <tr><td align="center" style="padding:32px 16px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">
        <tr><td style="background:#ffffff;border:1px solid rgba(15,30,20,0.08);padding:40px 40px 32px;">
          <img src="https://canvasroutes.com/logo-color.png" alt="Canvas Routes" width="150" style="display:block;width:150px;height:auto;border:0;outline:0;margin-bottom:24px;" />
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin-bottom:20px;"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background:#c5a882;">&nbsp;</td></tr></table>
          <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#8A6535;">Canvas Routes &middot; Admin</p>
          <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:300;line-height:1.2;color:#1a1a1a;">Confirm recovery email</h1>
          <p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#555;">Someone is setting this address as the recovery email for a Canvas Routes admin account. Enter this code to confirm it's you. It expires in 10 minutes.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="background:#F5F1EC;border:1px solid rgba(197,168,130,0.5);padding:16px 32px;">
              <span style="font-family:Arial,Helvetica,sans-serif;font-size:32px;font-weight:700;letter-spacing:8px;color:#0F1E14;">${h(code)}</span>
            </td></tr>
          </table>
          <p style="margin:28px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:1.7;color:#999;">Didn't request this? You can safely ignore this email &mdash; nothing changes unless this code is entered.</p>
        </td></tr>
        <tr><td style="background:#EDE8E1;padding:16px 40px;">
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8a8378;">&copy; 2026 Canvas Routes Events Inc. &mdash; Montreal, QC.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Step 1 of setting a recovery email: proves the admin actually controls the
// candidate address before it's trusted as an alternate code-delivery
// destination (app/api/admin/mfa/send-code and verify both read the saved
// address straight from app_metadata — never client-supplied — so a
// recovery email can only ever be one that already passed this check).
export async function POST(request) {
  const user = await requireAdmin()
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { email } = await request.json().catch(() => ({}))
  const candidate = normalizeEmail(email)
  if (!isValidEmail(candidate)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (candidate === normalizeEmail(user.email)) {
    return Response.json({ error: "That's already your primary sign-in email — pick a different address." }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    captureException(new Error('RESEND_API_KEY missing for admin MFA recovery-email send'), { context: 'admin-mfa-recovery-send-code' })
    return Response.json({ error: 'Email delivery is not configured.' }, { status: 503 })
  }

  const allowed = await canSendCode(user.id, candidate)
  if (!allowed) {
    return Response.json({ error: 'Too many codes requested for this address. Please wait a few minutes and try again.' }, { status: 429 })
  }

  const code = await issueCode(user.id, candidate)

  after(() =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: candidate,
        subject: `Confirm your recovery email: ${code}`,
        html: otpEmailHtml({ code }),
      }),
    }).then(res => {
      if (!res.ok) return res.text().then(txt => { throw new Error(`Resend non-200: ${res.status} ${txt}`) })
    }).catch(err => captureException(err, { context: 'admin-mfa-recovery-send-code' }))
  )

  return Response.json({ ok: true })
}
