import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../../../lib/adminAudit.js'
import { captureException } from '../../../../../../lib/sentry'

const BUCKET_BY_SOURCE = { member: 'gallery-photos', non_member: 'photo-shares' }

export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const supabase = createAdminClient()

  const { data: sub } = await supabase.from('gallery_photo_submissions').select('*').eq('id', id).maybeSingle()
  if (!sub) return Response.json({ error: 'Submission not found.' }, { status: 404 })

  const bucket = BUCKET_BY_SOURCE[sub.source]
  const paths = [sub.storage_path, sub.original_path].filter(Boolean)
  if (paths.length) {
    await supabase.storage.from(bucket).remove(paths).catch(err =>
      captureException(err, { context: 'gallery-submission-reject-storage', submissionId: id }))
  }

  const { error } = await supabase.from('gallery_photo_submissions').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await logAdminAction(supabase, adminUser?.email, {
    action: 'gallery_submission.reject', entityType: 'gallery_photo_submission', entityId: id,
    entityName: sub.contributor_name,
  })
  return Response.json({ success: true })
}
