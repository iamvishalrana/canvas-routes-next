import { captureException, captureMessage } from '../../../../lib/sentry.js'
import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit.js'
import { emailShell, p, button } from '../../../../lib/emailLayout.js'

function resetHtml({ actionLink }) {
  return emailShell({
    title: 'Reset your Canvas Routes password',
    preheader: 'Reset the password for your Canvas Routes account. This link expires in 1 hour.',
    eyebrow: 'Canvas Routes &middot; Members',
    heading: 'Reset your password.',
    body: `
      ${p(`We received a request to reset the password for your Canvas Routes account. Click the button below to choose a new one.`, { mb: '24px' })}
      ${button(actionLink, 'Reset my password &rarr;', { variant: 'solid', mb: '24px' })}
      ${p(`This link expires in 1 hour. If you didn&rsquo;t request a password reset, you can safely ignore this email.`, { tone: 'fine', mb: '0' })}
    `,
  })
}

export async function POST(request) {
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 10, 60)) {
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
