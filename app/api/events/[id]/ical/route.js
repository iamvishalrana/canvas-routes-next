import { createAdminClient } from '../../../../../lib/supabase/admin'
import { eventCalendarRange } from '../../../../../lib/eventCalendarLinks'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'

function escapeIcs(str) {
  return (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export async function GET(request, { params }) {
  const { id } = await params
  const admin = createAdminClient()
  const { data: ev } = await admin
    .from('events')
    .select('id, name, date, date_display, location, description')
    .eq('id', id)
    .single()

  if (!ev || !ev.date) return new Response('Not found', { status: 404 })

  // Timed (DTSTART/DTEND in UTC) when the event has a structured start/end in
  // EVENT_TIMES, else an all-day entry (VALUE=DATE, DTEND exclusive next day).
  const range = eventCalendarRange(id, ev.date)
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const dtLines = range && !range.allDay
    ? [`DTSTART:${range.start}`, `DTEND:${range.end}`]
    : [`DTSTART;VALUE=DATE:${range ? range.start : ev.date.replace(/-/g, '')}`,
       `DTEND;VALUE=DATE:${range ? range.end : ev.date.replace(/-/g, '')}`]

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Canvas Routes//Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Canvas Routes',
    'BEGIN:VEVENT',
    `UID:event-${id}@canvasroutes.com`,
    `DTSTAMP:${dtstamp}`,
    ...dtLines,
    `SUMMARY:${escapeIcs(ev.name)}`,
    ev.location ? `LOCATION:${escapeIcs(ev.location)}` : null,
    ev.description ? `DESCRIPTION:${escapeIcs(ev.description)}` : null,
    `URL:${SITE}/members/events`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  const slug = (ev.name || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  return new Response(lines, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="canvas-routes-${slug}.ics"`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
