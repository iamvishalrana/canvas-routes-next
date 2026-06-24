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

// Old event names → canonical names (renames/reschedules)
export const EVENT_NAME_ALIASES = {
  'Into the Laurentians — May 31, 2026':             'Into the Laurentians — June 7, 2026',
  'Grand Prix Weekend Cars & Coffee — May 23, 2026': 'Grand Prix Weekend - Cars, Coffee & Cruise — May 23, 2026',
}

export function normalizeEventName(name) {
  return EVENT_NAME_ALIASES[name] ?? name
}
