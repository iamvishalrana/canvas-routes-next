import { after } from 'next/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { checkRateLimit } from '../../../lib/rateLimit'
import { captureException } from '../../../lib/sentry'
import { normalizeEmail } from '../../../lib/normalizeEmail'
import { buildAdminNotifyHtml } from '../../../lib/adminEmail'
import { buildNotifySignupHtml } from '../../../lib/notifySignupEmail'

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }

  if (body._hp) return Response.json({ success: true }) // honeypot — silently accept, do nothing

  const name = (body.name || '').trim()
  const email = normalizeEmail(body.email)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'Please enter a valid email.' }, { status: 400 })
  if (email.length > 254 || name.length > 100) return Response.json({ error: 'Input too long.' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('event_notify_subscribers')
    .upsert({ email, name: name || null }, { onConflict: 'email', ignoreDuplicates: false })
  if (error) {
    captureException(new Error(error.message), { context: 'notify-signup-db' })
    return Response.json({ error: 'Could not save your signup. Please try again.' }, { status: 500 })
  }

  after(() => Promise.allSettled([
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: email,
        subject: "You're on the list — Canvas Routes",
        html: buildNotifySignupHtml({ firstName: name.split(' ')[0] || '' }),
      }),
    }).catch(err => captureException(err, { context: 'notify-signup-confirm-email' })),
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: 'info@canvasroutes.com',
        subject: `New event-notify signup — ${name || email}`,
        html: buildAdminNotifyHtml('New event-notify signup', [
          ['Name',  name || '(not provided)'],
          ['Email', `<a href="mailto:${email}" style="color:#1a1a1a;">${email}</a>`],
        ]),
      }),
    }).catch(err => captureException(err, { context: 'notify-signup-admin-email' })),
  ]))

  return Response.json({ success: true })
}
