import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry'

// Remove one person's interest from a route (admin). Scoped to the route id
// in the URL so a stale/foreign interest id can't delete across routes.
export async function DELETE(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  let body = {}
  try { body = await request.json() } catch {}
  const interestId = body.interest_id
  if (!interestId) return Response.json({ error: 'Missing interest_id.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('route_interest')
    .delete()
    .eq('id', interestId)
    .eq('route_id', id)
    .select('id')
  if (error) {
    captureException(error, { context: 'admin-route-interest-delete', interestId })
    return Response.json({ error: error.message }, { status: 500 })
  }
  if (!data?.length) return Response.json({ error: 'Interest entry not found.' }, { status: 404 })
  return Response.json({ success: true })
}
