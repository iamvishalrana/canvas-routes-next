import { createAdminClient } from '../../../lib/supabase/admin'
import { captureException } from '../../../lib/sentry'
import { normalizeEmail } from '../../../lib/normalizeEmail'

// Public list of active routes with a live interested_count aggregate.
// Optional ?email= returns which route ids that person already registered for
// (used to pre-mark cards in member mode / on return visits).
export async function GET(request) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const email = normalizeEmail(searchParams.get('email') || '')

  const { data: routes, error } = await supabase
    .from('upcoming_routes')
    .select('id, slug, name, destination, month_label, description, duration_label, distance_label, target_count, sort_order, trip_type, price_per_car, price_range, itinerary, activity_options, dest_lat, dest_lng, launched, photo_url, registration_url')
    .eq('is_active', true)
    .eq('is_past', false)
    .order('sort_order', { ascending: true })
  if (error) {
    captureException(new Error(error.message), { context: 'roadtrips-list' })
    return Response.json({ error: 'Could not load routes.' }, { status: 500 })
  }

  const { data: interest } = await supabase
    .from('route_interest')
    .select('route_id, email')

  const counts = {}
  const mine = new Set()
  for (const r of interest || []) {
    counts[r.route_id] = (counts[r.route_id] || 0) + 1
    if (email && r.email === email) mine.add(r.route_id)
  }

  const result = (routes || []).map(r => ({
    ...r,
    interested_count: counts[r.id] || 0,
    registered: mine.has(r.id),
  }))
  return Response.json(result)
}
