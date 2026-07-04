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
