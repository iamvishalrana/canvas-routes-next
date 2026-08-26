import { requireAdmin } from '../../../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../../lib/sentry'
import { isSameEvent } from '../../../../../../../lib/eventCheckinShared.js'
import { emailShell, p, infoCard } from '../../../../../../../lib/emailLayout.js'

// Every value here can trace back to something a public registrant typed on
// their own form submission (name) — escape before landing in raw HTML,
// same as app/api/public/events/[id]/register/route.js.
function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function buildAcceptedHtml({ firstName, eventName, dateDisplay, location }) {
  const body = `
    ${p(`Your spot at <strong style="color:#161616;font-weight:600;">${eventName}</strong> is confirmed. See you there.`)}
    ${infoCard([
      dateDisplay && ['Date', dateDisplay],
      location && ['Location', location],
      ['Entry', 'Free'],
    ])}
    ${p(`Questions? Reply directly to this email &mdash; it comes straight to me.`, { mb: '6px' })}
    ${p(`&mdash; Jerry`, { tone: 'muted', mb: '0' })}
  `
  return emailShell({
    title: 'You’re confirmed — Canvas Routes',
    preheader: `Your spot at ${eventName} is confirmed.`,
    eyebrow: 'Canvas Routes · Registration Confirmed',
    heading: `You&rsquo;re in, ${firstName}.`,
    body,
  })
}

function buildDeclinedHtml({ firstName, eventName }) {
  const body = `
    ${p(`Thanks for your interest in <strong style="color:#161616;font-weight:600;">${eventName}</strong>. Every registration is personally reviewed, and we&rsquo;re not able to confirm your spot for this one.`)}
    ${p(`We&rsquo;d love to see you at a future meet &mdash; keep an eye on our Instagram or apply for membership for early access to what&rsquo;s next.`, { mb: '6px' })}
    ${p(`&mdash; Jerry`, { tone: 'muted', mb: '0' })}
  `
  return emailShell({
    title: 'Update on your registration — Canvas Routes',
    preheader: `An update on your registration for ${eventName}.`,
    eyebrow: 'Canvas Routes · Registration Update',
    heading: `Hey ${firstName}.`,
    body,
  })
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
    admin.from('events').select('id, name, date, date_display, location').eq('id', id).maybeSingle(),
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
  const html = decision === 'accept'
    ? buildAcceptedHtml({ firstName: h(firstName), eventName: h(ev.name), dateDisplay, location: ev.location || null })
    : buildDeclinedHtml({ firstName: h(firstName), eventName: h(ev.name) })
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
