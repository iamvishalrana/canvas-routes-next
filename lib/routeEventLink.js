// Resolves the linked Admin > Events row for a road-trip PaymentIntent's
// `type` metadata (road_trip_<slug>), so confirmation emails can link to the
// generic check-in page (/checkin/[eventId]) for any route on the generic
// system — WTET keeps its own dedicated /wtet/checkin link and isn't routed
// through here. See upcoming_routes.event_id (added alongside HTM's events
// row after it was reintroduced) for the underlying link.
export async function getRouteCheckinUrl(admin, piType) {
  if (!piType?.startsWith('road_trip_') || piType === 'road_trip_wtet') return null
  const slug = piType.slice('road_trip_'.length)
  const { data } = await admin.from('upcoming_routes').select('event_id').eq('slug', slug).maybeSingle()
  if (!data?.event_id) return null
  return `https://canvasroutes.com/checkin/${data.event_id}`
}
