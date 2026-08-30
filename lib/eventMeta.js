// Canonical event name → short key stored in members.event_attendance
export const EVENT_ATTENDANCE_KEYS = {
  'Cars & Coffee — May 9, 2026':                                   'cc_may9',
  'Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026':     'gp_may23',
  'Into the Laurentians — June 7, 2026':                           'laurentians_jun7',
  'Cars, Coffee & Dad Jokes — June 20, 2026':                      'ccd_jun20',
}

// Short key → canonical event name (reverse of above)
export const ATTENDANCE_KEY_TO_EVENT = Object.fromEntries(
  Object.entries(EVENT_ATTENDANCE_KEYS).map(([name, key]) => [key, name])
)

// Old event names → canonical names (renames/reschedules). Also covers events
// whose `events` table row was created with a shorter/undated name than the
// hardcoded CANONICAL_EVENTS string for the same event — without this, the
// two names are treated as different events (duplicate rows in admin lists,
// split attendance data between two keys).
export const EVENT_NAME_ALIASES = {
  'Into the Laurentians — May 31, 2026':             'Into the Laurentians — June 7, 2026',
  'Grand Prix Weekend Cars & Coffee — May 23, 2026': 'Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026',
  'Into The Laurentians':                            'Into the Laurentians — June 7, 2026',
  'Cars, Coffee & Dad Jokes':                         'Cars, Coffee & Dad Jokes — June 20, 2026',
  'Cars & Coffee- September 5':                        'Cars & Coffee — September 5, 2026',
  // Two prior renames (exact-date, then a first year-only pass) — both map
  // straight to the current canonical name since normalizeEventName() does a
  // single-hop lookup, not chained resolution.
  'Hello to Montebello — July 26, 2026':              'Hello to Montebello — 2026',
  'Hello to Montebello — August 1, 2026':              'Hello to Montebello — 2026',
}

export function normalizeEventName(name) {
  return EVENT_NAME_ALIASES[name] ?? name
}

// Total mapping: every event gets an attendance key. The four legacy events use
// their short keys (existing data); every other event keys by its canonical
// name — the same convention MembersClient already uses in the UI
// (MEMBER_ATTENDANCE_KEYS[ev.name] || ev.name). Both sync directions
// (members.event_attendance ↔ applications.registrations[].attended) must use
// these, otherwise attendance for newer events silently never syncs.
export function attendanceKey(eventName) {
  const canon = normalizeEventName(eventName)
  return EVENT_ATTENDANCE_KEYS[canon] ?? canon
}

export function attendanceKeyToEventName(key) {
  return ATTENDANCE_KEY_TO_EVENT[key] ?? normalizeEventName(key)
}

// Road-trip event names — these are registered via applications.stripe_payment_type
// rather than an `events` row, so they don't show up in the admin events list.
// Kept here so any new picker that needs "every event name that attendance can
// be tracked against" has one place to add a road trip, instead of another
// copy of the ROAD_TRIP_TYPE_TO_NAME map (the only other copy is
// app/members/(portal)/events/page.jsx — dashboard/page.jsx resolves
// attendance a different way and has no map of its own).
export const ROAD_TRIP_EVENT_NAMES = [
  'Whips to Eastern Townships — July 5, 2026',
  'Hello to Montebello — 2026',
  'Sunday Silhouette — 2026',
]

// applications.stripe_payment_type → canonical event name, for road trips only.
// Road trips share this ONE flat column across every flow a person ever pays
// for (see CLAUDE.md payment rule 22) — the type string itself is the only
// reliable way to tell which specific route a stored payment belongs to, so
// any code reading stripe_payment_type/stripe_amount_paid for a specific
// event must resolve it through this map and compare against that event's
// name, never trust the flat column just because a 'road_trip_' prefix is
// present (that only proves it's SOME road trip, not this one).
export const ROAD_TRIP_TYPE_TO_NAME = {
  'road_trip_wtet': 'Whips to Eastern Townships — July 5, 2026',
  'road_trip_hello-to-montebello': 'Hello to Montebello — 2026',
  'road_trip_sunday-silhouette-2026': 'Sunday Silhouette — 2026',
}

// Time-of-day for events whose `date_display`/`date` fields (both date-only)
// don't carry a time. Keyed by event id (not name — names get edited).
// `start`/`end` are 24h 'HH:MM' in Montreal local time and drive the
// timezone-correct calendar links (lib/eventCalendarLinks + the .ics
// endpoint); `display` is the human label shown on event pages and in emails.
// One source of truth: the display-only EVENT_TIME_OVERRIDES map below is
// derived from this, so page copy and calendar times can never drift apart.
// Add an entry per event that needs one; most events have no time to show.
export const EVENT_TIMES = {
  '1a020f09-f618-42ed-b646-75c1927da38a': { start: '09:00', end: '11:30', display: '9:00 AM – 11:30 AM' }, // Cars & Coffee — September 5, 2026
}

export function getEventTimes(eventId) {
  return EVENT_TIMES[eventId] || null
}

// Display-string view of EVENT_TIMES, for the pages that only need the label
// (/meet/[id] and the members-portal event detail page).
export const EVENT_TIME_OVERRIDES = Object.fromEntries(
  Object.entries(EVENT_TIMES).map(([id, t]) => [id, t.display])
)
