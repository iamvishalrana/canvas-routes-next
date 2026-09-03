import { after } from 'next/server'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { canSendCode, issueCode } from '../../../../../lib/otp'
import { captureException } from '../../../../../lib/sentry'
import { emailShell, p, codeBox } from '../../../../../lib/emailLayout'

function otpEmailHtml({ code }) {
  const body = `
    ${p(`Use this code to sign in to the Canvas Routes admin panel. It expires in 10 minutes.`)}
    ${codeBox(code)}
    ${p(`Didn't request this? Someone may have your admin password &mdash; consider changing it.`, { tone: 'fine', mb: '0' })}
  `
  return emailShell({
    title: 'Your Canvas Routes Admin Verification Code',
    preheader: `Your admin verification code: ${code}`,
    eyebrow: 'Canvas Routes &middot; Admin',
    heading: `Verify it&rsquo;s you`,
    body,
  })
}

// Sends a 6-digit code to the currently authenticated admin's own account
// email — or, when useRecovery is set, to their configured recovery email
// instead (for a login that can't reach the primary inbox). Shared by both
// first-time enrollment and every later login challenge
// (app/api/admin/mfa/verify/route.js) — proving control of a code sent to
// your own address means the same thing either way.
//
// The recovery address is never client-supplied here — it's read from this
// admin's own app_metadata (trusted, service-role-writable only), so a
// caller can request "use recovery" but can't redirect the code anywhere
// else.
export async function POST(request) {
  const user = await requireAdmin()
  if (!user) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { useRecovery } = await request.json().catch(() => ({}))
  let target = user.email
  if (useRecovery) {
    target = user.app_metadata?.mfa_recovery_email
    if (!target) return Response.json({ error: 'No recovery email is set on this account.' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    captureException(new Error('RESEND_API_KEY missing for admin MFA send'), { context: 'admin-mfa-send-code' })
    return Response.json({ error: 'Email delivery is not configured.' }, { status: 503 })
  }

  const allowed = await canSendCode(user.id, target)
  if (!allowed) {
    return Response.json({ error: 'Too many codes requested. Please wait a few minutes and try again.' }, { status: 429 })
  }

  const code = await issueCode(user.id, target)

  after(() =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: target,
        subject: `Your admin verification code: ${code}`,
        html: otpEmailHtml({ code }),
      }),
    }).then(res => {
      if (!res.ok) return res.text().then(txt => { throw new Error(`Resend non-200: ${res.status} ${txt}`) })
    }).catch(err => captureException(err, { context: 'admin-mfa-send-code' }))
  )

  return Response.json({ ok: true, email: target, hasRecoveryEmail: !!user.app_metadata?.mfa_recovery_email })
}
