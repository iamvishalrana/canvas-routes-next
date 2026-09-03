import { after } from 'next/server'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { canSendCode, issueCode } from '../../../../../../lib/otp'
import { normalizeEmail } from '../../../../../../lib/normalizeEmail'
import { isValidEmail } from '../../../../../../lib/emailValidation'
import { captureException } from '../../../../../../lib/sentry'
import { emailShell, p, codeBox } from '../../../../../../lib/emailLayout'

function otpEmailHtml({ code }) {
  const body = `
    ${p(`Someone is setting this address as the recovery email for a Canvas Routes admin account. Enter this code to confirm it&rsquo;s you. It expires in 10 minutes.`)}
    ${codeBox(code, { label: 'Confirmation Code' })}
    ${p(`Didn't request this? You can safely ignore this email &mdash; nothing changes unless this code is entered.`, { tone: 'fine', mb: '0' })}
  `
  return emailShell({
    title: 'Confirm Your Canvas Routes Admin Recovery Email',
    preheader: `Your recovery email confirmation code: ${code}`,
    eyebrow: 'Canvas Routes &middot; Admin',
    heading: `Confirm recovery email`,
    body,
  })
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
