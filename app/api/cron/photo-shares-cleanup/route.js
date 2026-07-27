import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { captureException } from '../../../../lib/sentry'

const BUCKET = 'photo-shares'

// Deletes every photo_shares row (and its storage files) whose 30-day
// expiry has passed. Storage removal happens before the DB delete — if it
// fails partway through, the DB rows for that share are left in place so
// the next run retries the same share rather than losing track of orphaned
// files.
async function cleanupExpiredShares() {
  const supabase = createAdminClient()
  const { data: expired, error } = await supabase
    .from('photo_shares').select('id, title').lte('expires_at', new Date().toISOString())
  if (error) throw new Error(error.message)
  if (!expired?.length) return { deletedShares: 0, deletedFiles: 0 }

  let deletedFiles = 0
  let deletedShares = 0
  for (const share of expired) {
    const { data: items } = await supabase.from('photo_share_items').select('storage_path').eq('share_id', share.id)
    const paths = (items || []).map(i => i.storage_path).filter(Boolean)
    if (paths.length) {
      const { error: removeErr } = await supabase.storage.from(BUCKET).remove(paths)
      if (removeErr) {
        captureException(new Error(removeErr.message), { context: 'photo-shares-cleanup-storage', shareId: share.id })
        continue // leave the DB row for next run rather than losing the file reference
      }
      deletedFiles += paths.length
    }
    const { error: delErr } = await supabase.from('photo_shares').delete().eq('id', share.id)
    if (delErr) captureException(delErr, { context: 'photo-shares-cleanup-db', shareId: share.id })
    else deletedShares++
  }
  return { deletedShares, deletedFiles, totalExpired: expired.length }
}

// Called by Vercel cron (GET with Authorization: Bearer {CRON_SECRET})
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('Photo-shares cleanup cron: CRON_SECRET is not set — endpoint is disabled for safety')
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await cleanupExpiredShares()
    return Response.json({ ok: true, ...result })
  } catch (err) {
    console.error('Photo-shares cleanup failed:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// Called manually from the admin panel (POST, admin-only)
export async function POST() {
  try {
    const user = await requireAdmin()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const result = await cleanupExpiredShares()
    return Response.json({ ok: true, ...result })
  } catch (err) {
    console.error('Photo-shares cleanup error:', err.message)
    return Response.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
