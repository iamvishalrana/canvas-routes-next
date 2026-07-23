import { after } from 'next/server'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { listEventRegistrants, resolveCheckinSectionsBatch } from '../../../../../../lib/eventCheckinShared'
import { buildCheckinReminderHtml } from '../../../../../../lib/checkinReminderEmail'
import { captureException, captureMessage } from '../../../../../../lib/sentry.js'

// POST { emails?: string[] } — reminder to finish check-in, sent only to
// registrants who haven't completed every enabled section yet. Omitting
// emails sends to everyone still incomplete; passing emails scopes it to
// those specific people (e.g. a single "resend" from one registrant's row).
export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { eventId } = await params

  let body
  try { body = await request.json() } catch { body = {} }
  const onlyEmails = Array.isArray(body?.emails) ? new Set(body.emails.map(e => (e || '').toLowerCase())) : null

  const admin = createAdminClient()
  const { data: event, error: eventErr } = await admin.from('events')
    .select('id, name, checkin_enabled, checkin_sections')
    .eq('id', eventId).maybeSingle()
  if (eventErr || !event || !event.checkin_enabled) return Response.json({ error: 'Check-in is not enabled for this event.' }, { status: 404 })

  const sections = event.checkin_sections || []
  const hasTrip = sections.includes('trip_details')
  const hasWaiver = sections.includes('waiver')
  const hasLunch = sections.includes('lunch')

  const [registrants, { data: checkins }] = await Promise.all([
    listEventRegistrants(admin, eventId, event.name),
    admin.from('event_checkins').select('email, trip_details, waiver, lunch, car_photo').eq('event_id', eventId),
  ])
  const checkinByEmail = new Map((checkins || []).map(c => [(c.email || '').toLowerCase(), c]))
  // Resolved per-registrant — car_photo drops out for anyone exempt (already
  // sent one / attended a route with us before), so this reminder never nags
  // them about something they were never meant to be asked for.
  const sectionsByEmail = await resolveCheckinSectionsBatch(admin, registrants.map(r => r.email), sections)

  const incomplete = registrants.filter(r => {
    if (onlyEmails && !onlyEmails.has(r.email)) return false
    const c = checkinByEmail.get(r.email)
    const effectiveSections = sectionsByEmail.get(r.email) || sections
    const hasCarPhoto = effectiveSections.includes('car_photo')
    const done = (!hasTrip || c?.trip_details) && (!hasWaiver || c?.waiver) && (!hasLunch || c?.lunch?.length > 0) && (!hasCarPhoto || c?.car_photo)
    return !done
  })

  if (incomplete.length === 0) return Response.json({ success: true, sentCount: 0 })
  if (!process.env.RESEND_API_KEY) return Response.json({ error: 'Email not configured.' }, { status: 503 })

  after(() => Promise.allSettled(incomplete.map(r => {
    const firstName = (r.name || '').trim().split(' ')[0] || 'there'
    const checkinUrl = `https://canvasroutes.com/checkin/${eventId}?email=${encodeURIComponent(r.email)}`
    return fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: r.email,
        reply_to: 'jerry@canvasroutes.com',
        subject: `Reminder — complete your check-in for ${event.name}`,
        html: buildCheckinReminderHtml(firstName, checkinUrl, event.name),
        text: `Hey ${firstName},\n\nYou're registered for ${event.name}, but we still need a few things from you before the day. Complete your check-in here: ${checkinUrl}\n\nIf you've already completed check-in, you can ignore this email.\n\nJerry\nCanvas Routes`,
      }),
    }).then(res => { if (!res.ok) captureMessage('Resend non-200 — checkin-reminder-email', { status: res.status, email: r.email }) })
      .catch(err => captureException(err, { context: 'checkin-reminder-email', email: r.email }))
  })))

  return Response.json({ success: true, sentCount: incomplete.length })
}
