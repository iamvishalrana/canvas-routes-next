import { requireAdmin } from '../../../../../../lib/supabase/authCheck.js'
import { createAdminClient } from '../../../../../../lib/supabase/admin.js'
import { logAdminAction } from '../../../../../../lib/adminAudit.js'

// POST — wipes every ballot for this event only. Irreversible; client gates
// this behind a two-step confirm, same as the WTET reset button.
export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { eventId } = await params

  const admin = createAdminClient()
  const { error, count } = await admin
    .from('event_awards_votes')
    .delete({ count: 'exact' })
    .eq('event_id', eventId)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  await logAdminAction(admin, adminUser.email, {
    action: 'event_awards.reset',
    entityType: 'event',
    entityId: eventId,
    metadata: { deleted: count ?? 0 },
  })

  return Response.json({ success: true, deleted: count ?? 0 })
}
