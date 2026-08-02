import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../../../lib/adminAudit.js'
import { captureException } from '../../../../../../lib/sentry'

// Copies a pending submission into the real, visible destination
// (gallery_photos for a member's event album, photo_share_items for a
// non-member's folder) and deletes the staging row — never leaves the same
// photo living in two places. Member submissions also get auto-tagged
// (gallery_photo_tags) so "Featuring: [name]" shows automatically, reusing
// the existing tag display in the members portal.
export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const supabase = createAdminClient()

  const { data: sub } = await supabase.from('gallery_photo_submissions').select('*').eq('id', id).maybeSingle()
  if (!sub) return Response.json({ error: 'Submission not found.' }, { status: 404 })

  if (sub.source === 'member') {
    const { data: row, error: insertErr } = await supabase.from('gallery_photos').insert({
      category: 'event',
      album: sub.album,
      album_date: sub.album_date,
      photo_url: sub.photo_url,
      storage_path: sub.storage_path,
      original_path: sub.original_path,
      original_url: sub.original_url,
    }).select('id').single()
    if (insertErr) {
      captureException(insertErr, { context: 'gallery-submission-publish-member', submissionId: id })
      return Response.json({ error: 'Could not publish this photo.' }, { status: 500 })
    }
    const { error: tagErr } = await supabase.from('gallery_photo_tags').insert({ photo_id: row.id, member_id: sub.member_id })
    if (tagErr) captureException(tagErr, { context: 'gallery-submission-publish-tag', submissionId: id })
  } else {
    const { error: insertErr } = await supabase.from('photo_share_items').insert({
      folder_id: sub.photo_share_folder_id,
      storage_path: sub.storage_path,
      original_path: sub.original_path,
    })
    if (insertErr) {
      captureException(insertErr, { context: 'gallery-submission-publish-nonmember', submissionId: id })
      return Response.json({ error: 'Could not publish this photo.' }, { status: 500 })
    }
  }

  const { error: delErr } = await supabase.from('gallery_photo_submissions').delete().eq('id', id)
  if (delErr) captureException(delErr, { context: 'gallery-submission-publish-cleanup', submissionId: id })

  await logAdminAction(supabase, adminUser?.email, {
    action: 'gallery_submission.publish', entityType: 'gallery_photo_submission', entityId: id,
    entityName: sub.contributor_name,
  })
  return Response.json({ success: true })
}
