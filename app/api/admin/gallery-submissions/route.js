import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'

// Pending self-uploaded photos awaiting review — see
// supabase/migrations/20260810_gallery_photo_submissions.sql. Grouped
// client-side by contributor_name + album/folder.
export async function GET() {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()

  const { data: rows, error } = await supabase.from('gallery_photo_submissions')
    .select('*, photo_share_folders(title)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const enriched = (rows || []).map(r => ({
    ...r,
    folder_title: r.photo_share_folders?.title || null,
    photo_share_folders: undefined,
  }))
  return Response.json(enriched)
}
