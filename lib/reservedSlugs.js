// Every top-level single-path-segment name already in use under app/ —
// an event slug matching one of these would silently shadow (or be
// shadowed by) a real page. Kept as a static list rather than read from
// the filesystem at request time, since middleware runs on every request
// and can't safely touch the filesystem in all deployment runtimes.
//
// Whenever a new top-level route folder is added directly under app/
// (e.g. app/something/page.jsx or app/something/route.js), add its name
// here too — otherwise an admin could pick that name as an event slug and
// the two would collide. This list is defensive on the write side only:
// middleware never rewrites a path unless it finds a real matching slug in
// the events table, so a stale/incomplete list can't accidentally break a
// real page — it only means a new page's name isn't yet blocked as a slug.
export const RESERVED_SLUGS = new Set([
  // Auth/admin/API/members prefixes — already handled separately by
  // middleware's existing matcher, listed here too for defense in depth.
  'admin', 'members', 'api', 'auth',
  // Every other top-level folder under app/ (bare or dynamic-segment
  // prefix) as of 2026-08.
  'awards', 'cars-and-coffee-montreal', 'cars-coffee-dad-jokes', 'cbtd-2026',
  'checkin', 'cmt-2026', 'drive', 'faq', 'gallery', 'hello-to-montebello',
  'itinerary-hello-to-montebello-august-1', 'itinerary-into-the-laurentians-june-7',
  'itinerary-sunday-silhouette-august-30-2026', 'meet', 'membership',
  'notify', 'partners', 'privacy', 'routes', 'rsvp', 'spec',
  'sunday-silhouette-2026', 'terms', 'test', 'unsubscribe', 'verify',
  'whips-to-eastern-townships', 'wtet-awards', 'wtet',
  // Well-known static/system paths.
  'favicon.ico', 'robots.txt', 'sitemap.xml', 'login', 'logout',
])

export function normalizeSlug(raw) {
  return (raw || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || null
}

export function isReservedSlug(slug) {
  return RESERVED_SLUGS.has((slug || '').toLowerCase())
}
