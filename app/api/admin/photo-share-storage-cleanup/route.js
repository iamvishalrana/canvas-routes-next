import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../lib/adminAudit.js'
import { captureException } from '../../../../lib/sentry'

const BUCKET = 'photo-shares'

// Storage has no real folders — "folders" are just common path prefixes —
// so a folder containing nested folders needs walking one level at a time
// to reach the actual files underneath.
async function collectAllPaths(admin, prefix) {
  const { data: entries } = await admin.storage.from(BUCKET).list(prefix, { limit: 1000 })
  let paths = []
  for (const entry of (entries || [])) {
    const full = `${prefix}/${entry.name}`
    if (entry.id === null) paths = paths.concat(await collectAllPaths(admin, full))
    else paths.push(full)
  }
  return paths
}

// One-off cleanup for the 2026-07-28 non-member-sharing restructure: that
// migration dropped the old photo_shares/photo_share_items tables, which
// removes DB rows but not the actual files in Storage (a separate system).
// Deletes every top-level folder in the bucket that no current
// photo_share_people row points at, and everything inside it.
export async function POST() {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const admin = createAdminClient()

  try {
    const { data: people } = await admin.from('photo_share_people').select('id')
    const activeIds = new Set((people || []).map(p => p.id))

    const { data: top, error } = await admin.storage.from(BUCKET).list('', { limit: 1000 })
    if (error) throw new Error(error.message)

    const orphanFolders = (top || []).filter(e => e.id === null && !activeIds.has(e.name))

    let deletedFiles = 0
    let deletedFolders = 0
    for (const folder of orphanFolders) {
      const paths = await collectAllPaths(admin, folder.name)
      if (paths.length) {
        for (let i = 0; i < paths.length; i += 100) {
          const { error: removeErr } = await admin.storage.from(BUCKET).remove(paths.slice(i, i + 100))
          if (removeErr) throw new Error(removeErr.message)
        }
        deletedFiles += paths.length
      }
      deletedFolders++
    }

    await logAdminAction(admin, adminUser?.email, {
      action: 'photo_share_storage.cleanup', entityType: 'storage_bucket', entityName: BUCKET,
      metadata: { deletedFolders, deletedFiles },
    })

    return Response.json({ success: true, deletedFolders, deletedFiles })
  } catch (err) {
    captureException(err, { context: 'photo-share-storage-cleanup' })
    return Response.json({ error: err.message || 'Cleanup failed.' }, { status: 500 })
  }
}
