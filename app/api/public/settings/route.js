import { createAdminClient } from '../../../../lib/supabase/admin'

const PUBLIC_KEYS = ['homepage_banner', 'event_page_url', 'event_registration_open', 'event_closed_message', 'routes_popup_enabled', 'routes_popup_mode', 'routes_popup_route_slug']

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', PUBLIC_KEYS)
    const obj = Object.fromEntries((data || []).map(r => [r.key, r.value]))

    // Resolve the specific route server-side so the homepage popup has
    // everything it needs from this one response — it used to separately
    // look this up from the teaserRoutes list fetched for an unrelated
    // section of the page, coupling the popup's readiness to that fetch.
    if (obj.routes_popup_mode === 'specific' && obj.routes_popup_route_slug) {
      const { data: route } = await supabase
        .from('upcoming_routes')
        .select('slug, name, destination, month_label, photo_url, launched, registration_url')
        .eq('slug', obj.routes_popup_route_slug)
        .maybeSingle()
      obj.routes_popup_route = route || null
    }

    return Response.json(obj, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
    })
  } catch {
    return Response.json({})
  }
}
