import { createAdminClient } from '../../../../lib/supabase/admin'

const PUBLIC_KEYS = ['homepage_banner', 'event_page_url', 'event_registration_open', 'event_closed_message']

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', PUBLIC_KEYS)
    const obj = Object.fromEntries((data || []).map(r => [r.key, r.value]))
    return Response.json(obj, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
    })
  } catch {
    return Response.json({})
  }
}
