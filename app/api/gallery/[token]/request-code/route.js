import { after } from 'next/server'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'
import { canSendCode, issueCode } from '../../../../../lib/otp'
import { captureException } from '../../../../../lib/sentry'
import { isValidEmail } from '../../../../../lib/emailValidation'
import { emailShell, p, codeBox, escapeEmail } from '../../../../../lib/emailLayout'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function otpEmailHtml({ firstName, code }) {
  const body = `
    ${p(`Hi ${escapeEmail(firstName)}, here&rsquo;s your verification code to view your Canvas Routes photos. It expires in 10 minutes.`)}
    ${codeBox(code)}
    ${p(`Didn't request this? You can safely ignore this email &mdash; nobody can view your photos without this code.`, { tone: 'fine', mb: '0' })}
  `
  return emailShell({
    title: 'Your Canvas Routes Gallery Code',
    preheader: `Your gallery verification code: ${code}`,
    eyebrow: 'Canvas Routes &middot; Private Gallery',
    heading: `Verify it&rsquo;s you`,
    body,
  })
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
  if (!isValidEmail(entered)) {
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
