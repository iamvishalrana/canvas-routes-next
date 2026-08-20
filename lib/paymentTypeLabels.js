// Human-readable labels for the Stripe `type` metadata that admin screens
// (Payments, Revenue) show to staff.
//
// IMPORTANT — these are DISPLAY-ONLY. The stored metadata value stays
// `road_trip_<slug>` because the webhook, both capture routes, and promo-code
// scoping all branch on `type.startsWith('road_trip_')` (see CLAUDE.md rule 15).
// Renaming the stored value would silently break payment capture, refunds,
// confirmation emails, and route-scoped promo codes. Only the label changes.
//
// Terminology: we no longer use the words "road trip" anywhere admins or members
// can see — every trip is a "Route". The `road_trip_` prefix is legacy plumbing
// only; when a type isn't in the map below, we derive a clean name from the slug
// and never surface the raw `road_trip_…` string.

export const PAYMENT_TYPE_LABELS = {
  membership_routes:       'Routes Member',
  membership_inner_circle: 'Inner Circle',
  road_trip_standard:      'Route (Standard)',
  road_trip_member:        'Route (Member)',
  road_trip_inner_circle:  'Route (Inner Circle)',
  road_trip_wtet:          'WTET — July 5, 2026',
  'road_trip_hello-to-montebello': 'Hello to Montebello — 2026',
  'road_trip_sunday-silhouette-2026': 'Sunday Silhouette — 2026',
  event_registration:      'Event Registration',
}

function titleize(slug) {
  return (slug || '')
    .split(/[-_]/).filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Turn a stored `type` metadata value into a clean label. Known types use the
// map; any other `road_trip_<slug>` (e.g. a newly launched route not yet added
// above) becomes the Title-Cased slug — a plain, clear name, never the raw key
// and never the words "road trip".
export function formatPaymentType(typeKey) {
  if (!typeKey) return '—'
  if (PAYMENT_TYPE_LABELS[typeKey]) return PAYMENT_TYPE_LABELS[typeKey]
  if (typeKey.startsWith('road_trip_')) {
    const name = titleize(typeKey.slice('road_trip_'.length))
    return name || 'Route'
  }
  if (typeKey.startsWith('membership_')) {
    const name = titleize(typeKey.slice('membership_'.length))
    return name ? `${name} Membership` : 'Membership'
  }
  return titleize(typeKey)
}
