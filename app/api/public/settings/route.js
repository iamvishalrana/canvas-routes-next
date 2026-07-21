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

    return Response.json(obj, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
    })
  } catch {
    return Response.json({})
  }
}
