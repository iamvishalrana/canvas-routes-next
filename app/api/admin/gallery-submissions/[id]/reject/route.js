import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../../../lib/adminAudit.js'
import { captureException } from '../../../../../../lib/sentry'
import { removeObjects } from '../../../../../../lib/r2'

const BUCKET_BY_SOURCE = { member: 'gallery-photos', non_member: 'photo-shares' }
// Only photo-shares (non-member submissions) has moved to R2 so far —
// gallery-photos (member submissions) is still on Supabase Storage until
// its own migration slice.
const R2_BUCKETS = new Set(['photo-shares'])

// Same atomic conditional-claim pattern as ./publish/route.js — the status
// flip happens first and is what prevents a double-click (or a race with a
// simultaneous Publish click) from processing the same row twice.
export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const supabase = createAdminClient()

  const { data: claimed, error: claimErr } = await supabase.from('gallery_photo_submissions')
    .update({ status: 'rejected' }).eq('id', id).eq('status', 'pending').select('*').maybeSingle()
  if (claimErr) return Response.json({ error: claimErr.message }, { status: 500 })
  if (!claimed) return Response.json({ success: true }) // already published/rejected by another request — no-op

  const bucket = BUCKET_BY_SOURCE[claimed.source]
  const paths = [claimed.storage_path, claimed.original_path].filter(Boolean)
  if (paths.length) {
    const removal = R2_BUCKETS.has(bucket)
      ? removeObjects({ bucket, paths })
      : supabase.storage.from(bucket).remove(paths)
    await removal.catch(err =>
      captureException(err, { context: 'gallery-submission-reject-storage', submissionId: id }))
  }

  const { error } = await supabase.from('gallery_photo_submissions').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await logAdminAction(supabase, adminUser?.email, {
    action: 'gallery_submission.reject', entityType: 'gallery_photo_submission', entityId: id,
    entityName: claimed.contributor_name,
  })
  return Response.json({ success: true })
}
