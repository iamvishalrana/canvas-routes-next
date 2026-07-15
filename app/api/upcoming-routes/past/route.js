import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureException } from '../../../../lib/sentry'

// Public list of completed routes — same table as /api/upcoming-routes,
// filtered the other way (is_past = true). Replaces the old hardcoded
// lib/pastRoutes.js so past routes are admin-editable/reorderable too.
export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('upcoming_routes')
    .select('slug, name, destination, month_label, description, photo_url, recap_href, target_count, cars_rolled_out, sort_order')
    .eq('is_past', true)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) {
    captureException(new Error(error.message), { context: 'roadtrips-past-list' })
    return Response.json({ error: 'Could not load past routes.' }, { status: 500 })
  }
  return Response.json(data || [])
}
