import { after } from 'next/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { checkRateLimit } from '../../../lib/rateLimit'
import { captureException } from '../../../lib/sentry'
import { normalizeEmail } from '../../../lib/normalizeEmail'
import { buildAdminNotifyHtml } from '../../../lib/adminEmail'
import { buildNotifySignupHtml } from '../../../lib/notifySignupEmail'

const NOTIFY_EVENT_NAME = 'Event Notifications List'

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

  // Reuses the applications table (same as every other registration flow) so
  // this shows up in the existing Applications/Contacts admin views as an
  // "Event Registrations" entry — no separate table or admin page needed.
  // Never blindly upsert `registrations` — merge with what's already there or
  // a repeat signup wipes an applicant's real event history.
  const { data: existing, error: lookupErr } = await supabase
    .from('applications')
    .select('id, name, registrations')
    .eq('email', email)
    .maybeSingle()
  if (lookupErr) {
    captureException(new Error(lookupErr.message), { context: 'notify-signup-lookup' })
    return Response.json({ error: 'Could not save your signup. Please try again.' }, { status: 500 })
  }

  const existingReg = (existing?.registrations || []).find(r => r.event === NOTIFY_EVENT_NAME)
  const newReg = { event: NOTIFY_EVENT_NAME, registered_at: existingReg?.registered_at || new Date().toISOString(), attended: null }
  const registrations = [...(existing?.registrations || []).filter(r => r.event !== NOTIFY_EVENT_NAME), newReg]

  const { data: appData, error: upsertErr } = await supabase.from('applications').upsert({
    email,
    name: name || existing?.name || null,
    registrations,
  }, { onConflict: 'email' }).select('id').single()
  if (upsertErr) {
    captureException(new Error(upsertErr.message), { context: 'notify-signup-upsert' })
    return Response.json({ error: 'Could not save your signup. Please try again.' }, { status: 500 })
  }

  // Ensure a contacts row exists so this signup appears in the admin Contacts tab
  const { error: contactErr } = await supabase.from('contacts')
    .upsert({ application_id: appData.id }, { onConflict: 'application_id', ignoreDuplicates: true })
  if (contactErr) captureException(new Error(contactErr.message), { context: 'notify-signup-contacts' })

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
