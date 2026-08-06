import { createAdminClient } from '../../../../lib/supabase/admin'

const PUBLIC_KEYS = [
  'homepage_banner', 'event_page_url',
  'routes_popup_enabled', 'routes_popup_mode', 'routes_popup_route_slug', 'routes_popup_event_id',
  // Second, optional popup card — see the comment in app/api/admin/settings/route.js.
  'routes_popup2_enabled', 'routes_popup2_mode', 'routes_popup2_route_slug', 'routes_popup2_event_id',
  // "Into the Laurentians" itinerary page's self-serve car-photo replacement
  // (app/api/drive/upload-photo) — written outside the admin PATCH route
  // since that flow is password-gated, not admin-authenticated.
  'drive_frederic_photo_url',
]

// Resolves one popup "slot" (mode + its route slug / event id) into real
// route/event data server-side, so the homepage popup needs no other fetch
// to have its content ready. Shared by both the first and second popup card
// so there's exactly one place that does this lookup, not two near-copies.
async function resolveSlot(supabase, mode, routeSlug, eventId) {
  if (mode === 'specific' && routeSlug) {
    const { data: route } = await supabase
      .from('upcoming_routes')
      .select('slug, name, destination, month_label, photo_url, launched, registration_url')
      .eq('slug', routeSlug)
      .maybeSingle()
    return { route: route || null, event: null }
  }
  if (mode === 'event' && eventId) {
    const { data: event } = await supabase
      .from('events')
      .select('id, name, date_display, location, description, photo_url, registration_url, public_registration_enabled')
      .eq('id', eventId)
      .maybeSingle()
    return { route: null, event: event || null }
  }
  return { route: null, event: null }
}

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', PUBLIC_KEYS)
    const obj = Object.fromEntries((data || []).map(r => [r.key, r.value]))

    const [slot1, slot2] = await Promise.all([
      resolveSlot(supabase, obj.routes_popup_mode, obj.routes_popup_route_slug, obj.routes_popup_event_id),
      resolveSlot(supabase, obj.routes_popup2_mode, obj.routes_popup2_route_slug, obj.routes_popup2_event_id),
    ])
    obj.routes_popup_route = slot1.route
    obj.routes_popup_event = slot1.event
    obj.routes_popup2_route = slot2.route
    obj.routes_popup2_event = slot2.event

    return Response.json(obj, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
    })
  } catch {
    return Response.json({})
  }
}
