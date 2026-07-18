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
// be tracked against" has one place to add a road trip, instead of a fourth
// copy of the ROAD_TRIP_TYPE_TO_NAME map already duplicated in
// app/members/(portal)/events/page.jsx and dashboard/page.jsx.
export const ROAD_TRIP_EVENT_NAMES = [
  'Whips to Eastern Townships — July 5, 2026',
  'Hello to Montebello — July 26, 2026',
]
