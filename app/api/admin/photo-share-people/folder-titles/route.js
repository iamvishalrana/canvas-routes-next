import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'

// Distinct folder titles across every non-member photo share, most-recently-
// used first — powers the "Folder title" datalist on the create-folder form
// so the same event name (e.g. "Hello to Montebello — August 2026") can be
// reused exactly across different people instead of retyped each time.
export async function GET() {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()

  const { data, error } = await supabase.from('photo_share_folders')
    .select('title, created_at').order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const seen = new Set()
  const titles = []
  for (const row of (data || [])) {
    if (seen.has(row.title)) continue
    seen.add(row.title)
    titles.push(row.title)
  }
  return Response.json({ titles })
}
