import { captureException, captureMessage } from '../../../../lib/sentry.js'
import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { checkRateLimit } from '../../../../lib/rateLimit.js'

function resetHtml({ actionLink }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your Canvas Routes password</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;">
  <tr><td align="center" style="padding:32px 16px 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">
      <tr><td style="background:#0F1E14;padding:32px 40px 28px;">
        <img src="https://canvasroutes.com/white-outline.png" alt="Canvas Routes" width="150" style="display:block;width:150px;height:auto;border:0;margin-bottom:24px;opacity:0.92;" />
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin-bottom:20px;"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background:#c5a882;">&nbsp;</td></tr></table>
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;">Canvas Routes &middot; Members</p>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:300;line-height:1.2;color:#F5F1EC;">Reset your password.</h1>
      </td></tr>
      <tr><td style="background:#ffffff;padding:36px 40px 32px;">
        <p style="margin:0 0 1.5em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">We received a request to reset the password for your Canvas Routes account. Click the button below to choose a new one.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
          <tr><td style="background:#0F1E14;">
            <a href="${actionLink}" style="display:block;padding:15px 32px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#F5F1EC;text-decoration:none;font-weight:600;text-align:center;">Reset my password &rarr;</a>
          </td></tr>
        </table>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#bbb;">This link expires in 1 hour. If you didn&apos;t request a password reset, you can safely ignore this email.</p>
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

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim() || 'unknown'
  if (await checkRateLimit(ip)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const { email } = body
  if (!email?.trim()) return Response.json({ error: 'Email required.' }, { status: 400 })

  // Fall back to Supabase default if Resend is not configured (dev environments)
  if (!process.env.RESEND_API_KEY) {
    const supabase = await createClient()
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/members/reset-password`,
    })
    return Response.json({ success: true })
  }

  // Generate a recovery link via the admin client (does not send Supabase's default email)
  const admin = createAdminClient()
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: email.trim(),
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/members/reset-password`,
    },
  })

  // Never reveal whether the email exists
  if (linkError) return Response.json({ success: true })

  const actionLink = linkData.properties?.action_link ?? ''

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: email.trim(),
        reply_to: 'info@canvasroutes.com',
        subject: 'Reset your Canvas Routes password',
        html: resetHtml({ actionLink }),
        text: `Reset your Canvas Routes password\n\nClick this link to reset your password:\n${actionLink}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.\n\nCanvas Routes · Montreal, QC`,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown')
      console.error('Password reset email send error:', errText)
      captureMessage(`Password reset email failed — ${email.trim()}`, { response: errText })
    }
  } catch (err) {
    console.error('Password reset email network error:', err)
    captureException(err, { context: 'forgot-password-email-network', email: email.trim() })
  }

  return Response.json({ success: true })
}
