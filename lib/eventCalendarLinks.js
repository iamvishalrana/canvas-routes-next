// Shared "Add to calendar" link builders for transactional emails. One place
// so the Google Calendar link, the Apple/Outlook .ics endpoint, and the on-page
// AddToCalendar button all describe the same event the same way.
//
// Events carry a date-only `date` plus, for some, a structured start/end time
// in lib/eventMeta's EVENT_TIMES (Montreal local). When times exist the links
// are timed and timezone-correct; when they don't, they fall back to a clean
// all-day entry — no caller has to special-case which kind of event it is.
import { getEventTimes } from './eventMeta.js'
import { MONTREAL_TZ } from './mtlTime.js'
import { FONT, COLOR } from './emailLayout.js'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'

// Milliseconds to add to a wall-clock-as-UTC instant to get the real UTC
// instant for that wall time in `timeZone`, computed for the specific date so
// it's correct across DST boundaries (EDT vs EST). Standard Intl-offset trick.
function tzOffsetMs(timeZone, date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)
  const m = {}
  for (const part of parts) if (part.type !== 'literal') m[part.type] = part.value
  let hour = +m.hour
  if (hour === 24) hour = 0 // some runtimes emit '24' for midnight
  const asUTC = Date.UTC(+m.year, +m.month - 1, +m.day, hour, +m.minute, +m.second)
  return asUTC - date.getTime()
}

// ('2026-09-05', '09:00', 'America/Montreal') → Date at the correct UTC instant.
function zonedTimeToUtc(dateStr, timeStr, timeZone) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, mi] = timeStr.split(':').map(Number)
  const wallAsUTC = Date.UTC(y, mo - 1, d, h, mi, 0)
  const offset = tzOffsetMs(timeZone, new Date(wallAsUTC))
  return new Date(wallAsUTC - offset)
}

// Date → 'YYYYMMDDTHHMMSSZ' (compact iCalendar/Google UTC form).
function fmtCompactUtc(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function isoDateOf(date) {
  const s = typeof date === 'string' ? date.slice(0, 10) : String(date || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

// Returns { dates, allDay } for use in both the Google link and the .ics —
// timed when the event has structured start/end, all-day otherwise.
// `dates` is a { start, end } pair of compact strings.
export function eventCalendarRange(eventId, date) {
  const isoDate = isoDateOf(date)
  if (!isoDate) return null
  const times = eventId ? getEventTimes(eventId) : null
  if (times?.start && times?.end) {
    return {
      allDay: false,
      start: fmtCompactUtc(zonedTimeToUtc(isoDate, times.start, MONTREAL_TZ)),
      end: fmtCompactUtc(zonedTimeToUtc(isoDate, times.end, MONTREAL_TZ)),
    }
  }
  // All-day: DTEND is exclusive, so it's the next day.
  const startYmd = isoDate.replace(/-/g, '')
  const next = new Date(`${isoDate}T12:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return { allDay: true, start: startYmd, end: next.toISOString().slice(0, 10).replace(/-/g, '') }
}

function googleCalUrl({ eventId, eventName, date, location }) {
  const range = eventCalendarRange(eventId, date)
  if (!range) return null
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventName || 'Canvas Routes Event',
    dates: `${range.start}/${range.end}`,
    details: `Canvas Routes — ${SITE}`,
    ...(location ? { location } : {}),
    sf: 'true',
    output: 'xml',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// Ready-to-embed "Add to calendar" block (Apple/Outlook + Google buttons),
// styled to match the rest of the email system. Pass RAW (unescaped) values —
// URL encoding is handled here. Returns '' when no valid date is available.
export function calendarButtonsHtml({ eventId, eventName, date, location, mb = '28px' }) {
  const icalUrl = eventId && isoDateOf(date) ? `${SITE}/api/events/${eventId}/ical` : null
  const gCalUrl = googleCalUrl({ eventId, eventName, date, location })
  if (!icalUrl && !gCalUrl) return ''

  const calLink = (href, label) =>
    `<a href="${href}" style="display:inline-block;padding:11px 20px;font-family:${FONT};font-size:10px;line-height:1;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:#555;text-decoration:none;border:1px solid rgba(0,0,0,0.18);border-radius:7px;">${label}</a>`

  return `
    <p style="margin:0 0 10px;font-family:${FONT};font-size:10px;line-height:1;letter-spacing:0.16em;text-transform:uppercase;color:${COLOR.muted};">Add to calendar</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 ${mb};"><tr>
      ${icalUrl ? `<td style="padding-right:8px;">${calLink(icalUrl, 'Apple / Outlook')}</td>` : ''}
      ${gCalUrl ? `<td>${calLink(gCalUrl, 'Google Calendar')}</td>` : ''}
    </tr></table>`
}
