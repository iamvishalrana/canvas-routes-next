import { createAdminClient } from '../../../../lib/supabase/admin'

// Resolves a road-trip slug to its linked events row id, so a bespoke
// itinerary page (which only knows its own slug) can call the generic
// /api/checkin/[eventId]/lookup endpoint without hardcoding a UUID.
export async function GET(request, { params }) {
  const { slug } = await params
  const admin = createAdminClient()
  const { data } = await admin.from('upcoming_routes').select('event_id').eq('slug', slug).maybeSingle()
  if (!data?.event_id) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ eventId: data.event_id })
}
