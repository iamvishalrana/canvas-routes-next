import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { captureException } from '../../../../lib/sentry'
import { buildAdminNotifyHtml } from '../../../../lib/adminEmail'

// Safety net for the interactive "finish" endpoints (member/gallery-submission
// and gallery/[token]/submit-finish): those fire the batched admin email
// right after a client-side upload loop completes, but if the browser tab
// closes mid-batch that call never happens — the photos are still safely
// staged in gallery_photo_submissions, just never announced. This sweeps up
// anything still un-notified after a 1-hour grace period (so it never fires
// mid-upload) and sends ONE digest covering everyone, then marks those rows
// notified_at so a later finish call or the next day's run won't re-include
// them.
async function sendDigest() {
  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: rows, error } = await admin.from('gallery_photo_submissions')
    .select('id, source, contributor_name, album, photo_share_folder_id, photo_share_folders(title)')
    .eq('status', 'pending').is('notified_at', null).lt('created_at', cutoff)
  if (error) throw new Error(error.message)
  if (!rows || rows.length === 0) return { sent: false, groups: 0, photos: 0 }

  const groups = new Map()
  for (const r of rows) {
    const target = r.source === 'member' ? r.album : (r.photo_share_folders?.title || 'General')
    const key = `${r.contributor_name}|||${target}|||${r.source}`
    if (!groups.has(key)) groups.set(key, { contributor: r.contributor_name, target, source: r.source, count: 0 })
    groups.get(key).count += 1
  }

  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: 'jerry@canvasroutes.com',
        subject: `${groups.size} photo upload${groups.size === 1 ? '' : 's'} awaiting review`,
        html: buildAdminNotifyHtml('Photo uploads awaiting review', [
          ...[...groups.values()].map(g => [`${g.contributor} — ${g.target} (${g.source === 'member' ? 'Member' : 'Non-member'})`, `${g.count} photo${g.count === 1 ? '' : 's'}`]),
          ['Review', '<a href="https://www.canvasroutes.com/admin/photos/submissions" style="color:#1a1a1a;">Review in admin →</a>'],
        ]),
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown')
      captureException(new Error(`gallery-submissions-digest email failed: ${errText}`), { context: 'gallery-submissions-digest' })
      return { sent: false, groups: groups.size, photos: rows.length }
    }
  }

  await admin.from('gallery_photo_submissions').update({ notified_at: new Date().toISOString() }).in('id', rows.map(r => r.id))
  return { sent: true, groups: groups.size, photos: rows.length }
}

// Called by Vercel cron (GET with Authorization: Bearer {CRON_SECRET})
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return Response.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await sendDigest()
    return Response.json({ ok: true, ...result })
  } catch (err) {
    captureException(err, { context: 'gallery-submissions-digest-cron' })
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// Called manually from the admin panel (POST, admin-only)
export async function POST() {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await sendDigest()
    return Response.json({ ok: true, ...result })
  } catch (err) {
    return Response.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
