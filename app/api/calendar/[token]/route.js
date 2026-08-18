import { createAdminClient } from '../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit'
import { getBirthdays } from '../../../../lib/adminBirthdays'

// Personal, token-gated .ics feed for the admin — one subscribable calendar
// covering upcoming events, every member/applicant's birthday (recurring
// yearly), and the admin's own day notes. The token in the URL (see
// app/api/admin/calendar/token/route.js) is the only access control — no
// login, so iOS/Google/Outlook can poll it unattended. Same "unguessable
// bearer token, no auth flow" pattern as /api/events/[id]/ical and the
// site's other token-gated public routes (rsvp, gallery shares).

function escapeIcs(str) {
  return (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}
const toIcsDate = (d) => d.replace(/-/g, '')
function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export async function GET(request, { params }) {
  const { token } = await params
  if (!token || !/^[a-f0-9-]{16,60}$/i.test(token)) return new Response('Not found', { status: 404 })

  const ip = getClientIp(request)
  // Generous — calendar clients (and the admin manually refreshing) poll
  // repeatedly; the token's entropy is the real defence, this is just hygiene.
  if (await checkRateLimit(ip, 60, 60, 'calendar-ics')) return new Response('Too many requests.', { status: 429 })

  const supabase = createAdminClient()
  const { data: setting } = await supabase.from('settings').select('value').eq('key', 'admin_calendar_token').maybeSingle()
  // Constant-shape 404 whether the token is stale or just malformed — never
  // confirm/deny which, so a guessed near-miss learns nothing.
  if (!setting?.value || setting.value !== token) return new Response('Not found', { status: 404 })

  // Small lookback so a meet from a few days ago doesn't vanish from the
  // feed immediately, but the calendar otherwise stays forward-looking.
  const lookback = new Date()
  lookback.setDate(lookback.getDate() - 7)
  const lookbackStr = lookback.toISOString().slice(0, 10)

  const [{ data: events }, birthdays, { data: notes }] = await Promise.all([
    supabase.from('events').select('id, name, date, location, description').gte('date', lookbackStr).order('date', { ascending: true }),
    getBirthdays(supabase),
    supabase.from('admin_calendar_notes').select('id, note_date, content').order('note_date', { ascending: true }),
  ])

  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Canvas Routes//Admin Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Canvas Routes',
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
  ]

  for (const ev of (events || [])) {
    if (!ev.date) continue
    lines.push(
      'BEGIN:VEVENT',
      `UID:event-${ev.id}@canvasroutes.com`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${toIcsDate(ev.date)}`,
      `DTEND;VALUE=DATE:${toIcsDate(addDays(ev.date, 1))}`,
      `SUMMARY:${escapeIcs(ev.name)}`,
      ev.location ? `LOCATION:${escapeIcs(ev.location)}` : null,
      ev.description ? `DESCRIPTION:${escapeIcs(ev.description)}` : null,
      'END:VEVENT',
    )
  }

  // One recurring all-day event per person — RRULE:FREQ=YEARLY means it
  // shows up every year from here on with no need to ever re-sync. The
  // anchor date's year is arbitrary (a birth year isn't collected/used
  // here); only the month/day matter for a yearly recurrence.
  for (const b of birthdays) {
    if (!b.email) continue
    const mm = String(b.month).padStart(2, '0')
    const dd = String(b.day).padStart(2, '0')
    const anchor = `2020-${mm}-${dd}`
    lines.push(
      'BEGIN:VEVENT',
      `UID:birthday-${encodeURIComponent(b.email.toLowerCase())}@canvasroutes.com`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${toIcsDate(anchor)}`,
      `DTEND;VALUE=DATE:${toIcsDate(addDays(anchor, 1))}`,
      'RRULE:FREQ=YEARLY',
      `SUMMARY:🎂 ${escapeIcs(b.name)}'s birthday`,
      'END:VEVENT',
    )
  }

  for (const note of (notes || [])) {
    if (!note.note_date) continue
    const summary = note.content.length > 60 ? `${note.content.slice(0, 57)}...` : note.content
    lines.push(
      'BEGIN:VEVENT',
      `UID:note-${note.id}@canvasroutes.com`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${toIcsDate(note.note_date)}`,
      `DTEND;VALUE=DATE:${toIcsDate(addDays(note.note_date, 1))}`,
      `SUMMARY:📝 ${escapeIcs(summary)}`,
      `DESCRIPTION:${escapeIcs(note.content)}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')

  return new Response(lines.filter(Boolean).join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="canvas-routes-calendar.ics"',
      'Cache-Control': 'private, max-age=900',
    },
  })
}
