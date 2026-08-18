// Builds the .ics text for the admin's personal calendar feed. Shared by the
// combined feed (app/api/calendar/[token]/route.js) and the three
// single-category feeds (app/api/calendar/[token]/[filter]/route.js) so
// there's exactly one place that knows how to render an event/birthday/note
// as a VEVENT — building it twice was exactly the kind of drift risk that's
// already bitten this codebase (see lib/expenseCategories.js's comment).
import { getBirthdays, isLeapDayBirthday } from './adminBirthdays'

function escapeIcs(str) {
  return (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}
const toIcsDate = (d) => d.replace(/-/g, '')

// RFC 5545 §3.1: a content line SHOULD NOT exceed 75 octets — a long event
// description or note (up to 2000 chars) easily blows past that on one
// unfolded line. iOS/Google/Outlook are lenient about this today, but that's
// a "works because they're forgiving," not "guaranteed by spec" — folding
// properly means this feed stays correct if any client (a future iOS
// release, or a non-Apple app someone points this same link at) ever parses
// more strictly. Folds on UTF-8 byte boundaries, never splitting inside a
// multi-byte character — this matters here because SUMMARY lines start with
// an emoji (🎂/📝).
function foldLine(line) {
  const bytes = Buffer.from(line, 'utf8')
  if (bytes.length <= 75) return line
  const out = []
  let start = 0
  let first = true
  while (start < bytes.length) {
    // The continuation line's mandatory leading space counts toward its own
    // 75-octet budget, so later segments get one fewer byte to work with.
    const limit = first ? 75 : 74
    let end = Math.min(start + limit, bytes.length)
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--
    out.push(bytes.slice(start, end).toString('utf8'))
    start = end
    first = false
  }
  return out.join('\r\n ')
}
function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// parts: { events, birthdays, notes } — which categories to include.
// calName: the X-WR-CALNAME iOS shows in its calendar list — distinct names
// per feed are what let separate subscriptions be toggled independently.
export async function buildCalendarFeed(supabase, { events: wantEvents, birthdays: wantBirthdays, notes: wantNotes, calName }) {
  const [eventsRes, birthdaysRes, notesRes] = await Promise.all([
    wantEvents
      // No date filter — every meet/route ever added shows up, past and
      // future, so the calendar doubles as a full club history.
      ? supabase.from('events').select('id, name, date, location, description').order('date', { ascending: true })
      : Promise.resolve({ data: [] }),
    wantBirthdays ? getBirthdays(supabase) : Promise.resolve([]),
    wantNotes
      ? supabase.from('admin_calendar_notes').select('id, note_date, content').order('note_date', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])
  const events = eventsRes.data || []
  const birthdays = birthdaysRes
  const notes = notesRes.data || []

  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Canvas Routes//Admin Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calName}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
  ]

  for (const ev of events) {
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
  // here) — getBirthdays() already guarantees month/day form a real date,
  // so no re-validation needed here.
  for (const b of birthdays) {
    if (!b.email) continue

    // Feb 29 birthdays specifically: anchoring RRULE:FREQ=YEARLY directly on
    // Feb 29 sounds right but isn't — per RFC 5545, a yearly recurrence on a
    // date that doesn't exist in a given year is simply skipped for that
    // year (this is what both iOS and Google Calendar actually do), so the
    // reminder would only fire once every 4 years instead of annually.
    // Observe it on Feb 28 every year instead, the common real-world
    // convention, so leap-day birthdays get a reliable annual reminder. A
    // single RRULE can't conditionally alternate between the 28th/29th per
    // year the way the UI's observedBirthdayDay() does, so the feed always
    // picks the 28th — the one choice that's guaranteed to exist every year.
    const isLeapDay = isLeapDayBirthday(b)
    const anchorDay = isLeapDay ? 28 : b.day
    const anchor = `2020-${String(b.month).padStart(2, '0')}-${String(anchorDay).padStart(2, '0')}`

    lines.push(
      'BEGIN:VEVENT',
      `UID:birthday-${encodeURIComponent(b.email.toLowerCase())}@canvasroutes.com`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${toIcsDate(anchor)}`,
      `DTEND;VALUE=DATE:${toIcsDate(addDays(anchor, 1))}`,
      'RRULE:FREQ=YEARLY',
      `SUMMARY:🎂 ${escapeIcs(b.name)}'s birthday${isLeapDay ? ' (leap day — observed Feb 28)' : ''}`,
      'END:VEVENT',
    )
  }

  for (const note of notes) {
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
  return lines.filter(Boolean).map(foldLine).join('\r\n')
}
