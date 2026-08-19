import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../../../lib/adminAudit.js'
import { captureException } from '../../../../../../lib/sentry'
import { createSharedPhotoAndLink } from '../../../../../../lib/photoShareDedup'

// Copies a pending submission into the real, visible destination
// (gallery_photos for a member's event album, photo_share_items for a
// non-member's folder). Member submissions also get auto-tagged
// (gallery_photo_tags) so "Featuring: [name]" shows automatically, reusing
// the existing tag display in the members portal.
//
// The status flip (pending -> published) is a conditional UPDATE, done
// BEFORE the destination insert — this is the actual lock. Only one request
// can ever match `.eq('status', 'pending')` on a given row; a double-click,
// a slow retry, or two admin tabs all race on that same conditional update,
// and every loser gets 0 affected rows back and no-ops instead of publishing
// the same photo twice. If the destination insert then fails, the claim is
// rolled back to 'pending' so the row is still reviewable. The final row
// delete is best-effort cleanup only — even if it fails, the row is left
// with status='published', which the review-queue GET already filters out
// (.eq('status','pending')), so a failed delete can never cause a re-publish.
export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const supabase = createAdminClient()

  const { data: claimed, error: claimErr } = await supabase.from('gallery_photo_submissions')
    .update({ status: 'published' }).eq('id', id).eq('status', 'pending').select('*').maybeSingle()
  if (claimErr) return Response.json({ error: claimErr.message }, { status: 500 })
  if (!claimed) return Response.json({ success: true }) // already published/rejected by another request — no-op

  if (claimed.source === 'member') {
    const { data: row, error: insertErr } = await supabase.from('gallery_photos').insert({
      category: 'event',
      album: claimed.album,
      album_date: claimed.album_date,
      caption: claimed.caption,
      photo_url: claimed.photo_url,
      storage_path: claimed.storage_path,
      original_path: claimed.original_path,
      original_url: claimed.original_url,
    }).select('id').single()
    if (insertErr) {
      captureException(insertErr, { context: 'gallery-submission-publish-member', submissionId: id })
      await supabase.from('gallery_photo_submissions').update({ status: 'pending' }).eq('id', id)
      return Response.json({ error: 'Could not publish this photo.' }, { status: 500 })
    }
    const { error: tagErr } = await supabase.from('gallery_photo_tags').insert({ photo_id: row.id, member_id: claimed.member_id })
    if (tagErr) captureException(tagErr, { context: 'gallery-submission-publish-tag', submissionId: id })
  } else {
    // Always creates a fresh canonical photo — non-member self-submissions
    // don't compute a content hash (see lib/hashFile.js, only used by the
    // admin direct-upload flow), so this intentionally never auto-links
    // into an existing shared photo. contentHash: null can never match
    // anything, by design (see the migration's unique index).
    const { data: folder } = await supabase.from('photo_share_folders').select('title').eq('id', claimed.photo_share_folder_id).maybeSingle()
    try {
      await createSharedPhotoAndLink(supabase, {
        folderId: claimed.photo_share_folder_id,
        storagePath: claimed.storage_path,
        originalPath: claimed.original_path,
        contentHash: null,
        folderTitle: folder?.title || '',
        caption: claimed.caption,
      })
    } catch (insertErr) {
      captureException(insertErr, { context: 'gallery-submission-publish-nonmember', submissionId: id })
      await supabase.from('gallery_photo_submissions').update({ status: 'pending' }).eq('id', id)
      return Response.json({ error: 'Could not publish this photo.' }, { status: 500 })
    }
  }

  const { error: delErr } = await supabase.from('gallery_photo_submissions').delete().eq('id', id)
  if (delErr) captureException(delErr, { context: 'gallery-submission-publish-cleanup', submissionId: id })

  await logAdminAction(supabase, adminUser?.email, {
    action: 'gallery_submission.publish', entityType: 'gallery_photo_submission', entityId: id,
    entityName: claimed.contributor_name,
  })
  return Response.json({ success: true })
}
