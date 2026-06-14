import { requireAdmin } from '../../../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../../../lib/supabase/admin'
import { buildEventConfirmHtml } from '../../../../../../../lib/eventConfirmEmail'
import { captureException } from '../../../../../../../lib/sentry'

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { email, name } = await request.json().catch(() => ({}))

  if (!email?.trim() || !name?.trim()) {
    return Response.json({ error: 'Email and name are required.' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'Email not configured.' }, { status: 503 })
  }

  const admin = createAdminClient()
  const { data: ev } = await admin
    .from('events')
    .select('id, name, date, date_display, location')
    .eq('id', id)
    .single()

  if (!ev) return Response.json({ error: 'Event not found.' }, { status: 404 })

  const firstName = name.trim().split(' ')[0]
  const html = buildEventConfirmHtml({
    firstName,
    eventName: ev.name,
    dateDisplay: ev.date_display || null,
    location: ev.location || null,
    isFree: true,
    amountPaid: 0,
    eventId: ev.id,
    date: ev.date || null,
  })

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: email.trim(),
        reply_to: 'info@canvasroutes.com',
        subject: `You're in — ${ev.name}`,
        html,
      }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      return Response.json({ error: d.message || `Resend error ${res.status}` }, { status: 502 })
    }
    return Response.json({ success: true })
  } catch (err) {
    captureException(err, { context: 'admin-confirm-email', email, eventId: id })
    return Response.json({ error: 'Failed to send email.' }, { status: 500 })
  }
}
