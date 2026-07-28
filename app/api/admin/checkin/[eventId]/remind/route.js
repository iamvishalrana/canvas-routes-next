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
    .select('id, name, date, date_display, location, checkin_enabled, checkin_sections')
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
  // Same "already has a car photo" definition the admin dashboard uses
  // (CheckinStatusClient.jsx's hasCarPhotoish) — a member's existing profile
  // photo counts too, not just this event's own submission. Without this,
  // someone the dashboard already shows as "Photo ✓" would still get a
  // reminder email telling them they still need to submit one.
  const emails = registrants.map(r => r.email)
  const { data: members } = emails.length
    ? await admin.from('members').select('email, cars, car_photo_url').in('email', emails)
    : { data: [] }
  const memberByEmail = new Map((members || []).map(m => [(m.email || '').toLowerCase(), m]))
  const hasProfilePhoto = email => {
    const m = memberByEmail.get(email)
    return !!(m?.cars?.[0]?.photo_url || m?.car_photo_url)
  }
  // Resolved per-registrant — car_photo drops out for anyone exempt (already
  // sent one / attended a route with us before), so this reminder never nags
  // them about something they were never meant to be asked for.
  const sectionsByEmail = await resolveCheckinSectionsBatch(admin, registrants.map(r => r.email), sections)

  const SECTION_LABELS = { trip_details: 'Trip details', waiver: 'Liability waiver', lunch: 'Lunch selection', car_photo: 'Car photo' }

  // Per-registrant, not just a done/not-done boolean — so the email can list
  // exactly what's missing for THEM instead of a generic "trip details,
  // waiver, and/or lunch, depending what's open" that made them guess.
  const incomplete = registrants
    .map(r => {
      const c = checkinByEmail.get(r.email)
      const effectiveSections = sectionsByEmail.get(r.email) || sections
      const hasCarPhoto = effectiveSections.includes('car_photo')
      const missing = [
        hasTrip && !c?.trip_details && 'trip_details',
        hasWaiver && !c?.waiver && 'waiver',
        hasLunch && !(c?.lunch?.length > 0) && 'lunch',
        hasCarPhoto && !c?.car_photo && !hasProfilePhoto(r.email) && 'car_photo',
      ].filter(Boolean)
      return { ...r, missing }
    })
    .filter(r => (!onlyEmails || onlyEmails.has(r.email)) && r.missing.length > 0)

  if (incomplete.length === 0) return Response.json({ success: true, sentCount: 0 })
  if (!process.env.RESEND_API_KEY) return Response.json({ error: 'Email not configured.' }, { status: 503 })

  after(() => Promise.allSettled(incomplete.map(r => {
    const firstName = (r.name || '').trim().split(' ')[0] || 'there'
    const checkinUrl = `https://canvasroutes.com/checkin/${eventId}?email=${encodeURIComponent(r.email)}`
    const missingLabels = r.missing.map(s => SECTION_LABELS[s])
    return fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: r.email,
        reply_to: 'jerry@canvasroutes.com',
        subject: `Reminder — complete your check-in for ${event.name}`,
        html: buildCheckinReminderHtml({ firstName, checkinUrl, eventLabel: event.name, dateDisplay: event.date_display || event.date, location: event.location, missingLabels }),
        text: `Hey ${firstName},\n\nYou're registered for ${event.name}${event.date_display || event.date ? ` on ${event.date_display || event.date}` : ''}${event.location ? ` at ${event.location}` : ''}, but we still need the following from you before the day:\n${missingLabels.map(l => `- ${l}`).join('\n')}\n\nComplete your check-in here: ${checkinUrl}\n\nIf you've already completed check-in, you can ignore this email.\n\nJerry\nCanvas Routes`,
      }),
    }).then(res => { if (!res.ok) captureMessage('Resend non-200 — checkin-reminder-email', { status: res.status, email: r.email }) })
      .catch(err => captureException(err, { context: 'checkin-reminder-email', email: r.email }))
  })))

  return Response.json({ success: true, sentCount: incomplete.length })
}
