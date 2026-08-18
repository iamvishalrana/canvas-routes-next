// Builds the .ics text for the admin's personal calendar feed. Shared by the
// combined feed (app/api/calendar/[token]/route.js) and the three
// single-category feeds (app/api/calendar/[token]/[filter]/route.js) so
// there's exactly one place that knows how to render an event/birthday/note
// as a VEVENT — building it twice was exactly the kind of drift risk that's
// already bitten this codebase (see lib/expenseCategories.js's comment).
import { getBirthdays } from './adminBirthdays'

function escapeIcs(str) {
  return (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}
const toIcsDate = (d) => d.replace(/-/g, '')
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
  return lines.filter(Boolean).join('\r\n')
}
