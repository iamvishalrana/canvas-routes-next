// Single source of truth for "Montreal time" across the whole site. Vercel
// functions run in UTC by default, so any toLocaleDateString/toLocaleString/
// toLocaleTimeString call that omits `timeZone` silently renders in UTC on
// the server and in the visitor's own local zone on the client — neither of
// which is Montreal. Import this constant and pass it as `timeZone` on every
// call that formats a real instant-in-time (created_at, signed_at, sent_at,
// expires_at, etc.).
//
// Does NOT apply to pure calendar-date values with no time-of-day component
// (e.g. an event's `date` field like "2026-07-05") — those are usually
// constructed via local Date components or a noon-anchor trick specifically
// to dodge timezone shift, and forcing this timeZone on them can roll the
// displayed day back by one instead of fixing anything.
export const MONTREAL_TZ = 'America/Toronto'

// Breaks the current instant into Montreal-local date/time parts — for cron
// gating logic that needs to know "is it currently around midnight in
// Montreal" regardless of DST. Vercel Cron schedules are fixed UTC times and
// aren't DST-aware on their own, so a cron meant to fire "at local midnight"
// has to run more often (e.g. hourly) and use this to recognize the one
// firing per day that actually lands on Montreal's midnight hour.
export function nowInMontreal(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MONTREAL_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  }).formatToParts(date)
  const get = (type) => parts.find(p => p.type === type)?.value
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10), // 1-12
    day: parseInt(get('day'), 10),
    // Some ICU implementations report hour 24 instead of 0 for midnight with
    // hour12:false — normalize so callers can compare against 0 reliably.
    hour: parseInt(get('hour'), 10) % 24,
  }
}
