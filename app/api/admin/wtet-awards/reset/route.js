import { requireAdmin } from '../../../../../lib/supabase/authCheck.js'
import { createAdminClient } from '../../../../../lib/supabase/admin.js'

// POST — wipes every ballot in wtet_awards_votes. Used to clear test/placeholder
// votes before real voting starts. Irreversible; client gates this behind a
// two-step confirm.
export async function POST() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createAdminClient()
  const { error, count } = await supabase
    .from('wtet_awards_votes')
    .delete({ count: 'exact' })
    .not('id', 'is', null)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true, deleted: count ?? 0 })
}
