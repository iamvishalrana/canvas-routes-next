import { createAdminClient } from '../../../../lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('events')
    .select('id, name, date, date_display, location, description, type, registration_url, registration_opens_at, registration_closes_at, priority_window_end, member_price, photo_url, registration_enabled')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('date', { ascending: true })
  return Response.json(data || [], {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  })
}
