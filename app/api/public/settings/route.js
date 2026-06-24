import { createAdminClient } from '../../../../lib/supabase/admin'

const PUBLIC_KEYS = ['homepage_banner', 'event_page_url', 'event_registration_open', 'event_closed_message']

const WTET_REGISTRATION_OPEN = new Date('2026-06-24T20:00:00Z')

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', PUBLIC_KEYS)
    const obj = Object.fromEntries((data || []).map(r => [r.key, r.value]))

    // Auto-open WTET registration once the scheduled time passes — no manual toggle needed
    if (new Date() >= WTET_REGISTRATION_OPEN) {
      obj.event_registration_open = 'true'
    }

    return Response.json(obj, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' },
    })
  } catch {
    return Response.json({})
  }
}
