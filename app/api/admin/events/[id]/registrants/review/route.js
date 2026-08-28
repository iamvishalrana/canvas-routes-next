import { requireAdmin } from '../../../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../../lib/sentry'
import { isSameEvent } from '../../../../../../../lib/eventCheckinShared.js'
import { buildAcceptedHtml, buildDeclinedHtml } from '../../../../../../../lib/eventReviewEmails.js'
import { getEventTimes } from '../../../../../../../lib/eventMeta.js'
import { calendarButtonsHtml } from '../../../../../../../lib/eventCalendarLinks.js'

// Every value here can trace back to something a public registrant typed on
// their own form submission (name) — escape before landing in raw HTML,
// same as app/api/public/events/[id]/register/route.js.
function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// Admin decision on a public event registration submitted through
// /meet/[id] (app/api/public/events/[id]/register) — every one of those
// starts life with review_status: 'pending' on its applications.registrations[]
// entry. This is the only place that entry ever moves to accepted/declined,
// and firing the matching email is the whole point of the button, so (unlike
// the high-volume automated flows CLAUDE.md's after()-only rule targets)
// this awaits the send directly, same as the existing Invite action in
// ../confirm-email/route.js, so the admin gets immediate pass/fail feedback
// on their own explicit click.
export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { email, decision } = await request.json().catch(() => ({}))

  if (!email?.trim()) return Response.json({ error: 'Email is required.' }, { status: 400 })
  if (!['accept', 'decline'].includes(decision)) return Response.json({ error: 'Invalid decision.' }, { status: 400 })

  const admin = createAdminClient()
  const normalEmail = email.toLowerCase().trim()

  const [{ data: ev }, { data: app }] = await Promise.all([
    admin.from('events').select('id, name, date, date_display, location, photo_url').eq('id', id).maybeSingle(),
    admin.from('applications').select('id, name, registrations').eq('email', normalEmail).maybeSingle(),
  ])
  if (!ev) return Response.json({ error: 'Event not found.' }, { status: 404 })
  if (!app) return Response.json({ error: 'Registrant not found.' }, { status: 404 })

  const regs = app.registrations || []
  const idx = regs.findIndex(r => isSameEvent(r.event, ev.name))
  if (idx === -1) return Response.json({ error: 'This person has no registration for this event.' }, { status: 404 })

  const reviewStatus = decision === 'accept' ? 'accepted' : 'declined'
  const updatedRegs = regs.map((r, i) => i === idx ? { ...r, review_status: reviewStatus } : r)

  const { error: updateErr } = await admin.from('applications').update({ registrations: updatedRegs }).eq('id', app.id)
  if (updateErr) {
    captureException(updateErr, { context: 'admin-registrant-review-update', eventId: id, email: normalEmail })
    return Response.json({ error: 'Failed to update registration status.' }, { status: 500 })
  }

  if (!process.env.RESEND_API_KEY) return Response.json({ success: true, review_status: reviewStatus })

  const firstName = (app.name || '').trim().split(' ')[0] || 'there'
  const dateDisplay = ev.date_display || ev.date || null
  const timeDisplay = getEventTimes(ev.id)?.display || null
  const html = decision === 'accept'
    ? buildAcceptedHtml({
        firstName: h(firstName), eventName: h(ev.name), dateDisplay, timeDisplay,
        location: ev.location || null, photoUrl: ev.photo_url || null,
        calendarHtml: calendarButtonsHtml({ eventId: ev.id, eventName: ev.name, date: ev.date, location: ev.location || null }),
      })
    : buildDeclinedHtml({ firstName: h(firstName), eventName: h(ev.name), photoUrl: ev.photo_url || null })
  const subject = decision === 'accept' ? `You're confirmed — ${ev.name}` : `Update on your registration — ${ev.name}`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <jerry@canvasroutes.com>',
        to: normalEmail,
        reply_to: 'jerry@canvasroutes.com',
        subject,
        html,
      }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      captureException(new Error(d.message || `Resend error ${res.status}`), { context: 'admin-registrant-review-email', eventId: id, email: normalEmail })
      return Response.json({ error: 'Status updated, but the email failed to send.' }, { status: 502 })
    }
  } catch (err) {
    captureException(err, { context: 'admin-registrant-review-email', eventId: id, email: normalEmail })
    return Response.json({ error: 'Status updated, but the email failed to send.' }, { status: 500 })
  }

  return Response.json({ success: true, review_status: reviewStatus })
}
