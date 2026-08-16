import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { captureException, captureMessage } from '../../../../lib/sentry'
import { buildPhotoExpiryReminderHtml, photoExpiryReminderText } from '../../../../lib/photoExpiryReminderEmail'

// How many days before a folder's expiry the recipient gets a "download it now"
// reminder. Folders live 30 days by default; this warns ~3 days before the
// photo-shares-cleanup cron removes them.
const REMINDER_DAYS = 3

// Emails each non-member ~REMINDER_DAYS before their photo folder(s) expire, so
// nothing is silently deleted without a chance to download it. One email per
// person listing all their soon-to-expire folders (a person can have several).
// reminder_sent_at (set only after a confirmed send) makes this idempotent
// across the daily runs; a failed send is left unstamped so it retries.
async function sendExpiryReminders() {
  if (!process.env.RESEND_API_KEY) return { skipped: 'RESEND_API_KEY missing', reminded: 0, people: 0 }
  const supabase = createAdminClient()

  const nowIso = new Date().toISOString()
  const windowEnd = new Date(Date.now() + REMINDER_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Folders entering their final REMINDER_DAYS that haven't been reminded yet.
  // Already-expired folders are excluded (cleanup handles those); the null
  // reminder_sent_at filter stops a second email on later daily runs.
  const { data: folders, error } = await supabase
    .from('photo_share_folders')
    .select('id, title, person_id, expires_at')
    .gt('expires_at', nowIso)
    .lte('expires_at', windowEnd)
    .is('reminder_sent_at', null)
  if (error) throw new Error(error.message)
  if (!folders?.length) return { reminded: 0, people: 0 }

  // Group by person so someone with several folders expiring together gets one
  // email, not one per folder.
  const byPerson = new Map()
  for (const f of folders) {
    if (!byPerson.has(f.person_id)) byPerson.set(f.person_id, [])
    byPerson.get(f.person_id).push(f)
  }

  let reminded = 0
  let people = 0
  for (const [personId, personFolders] of byPerson) {
    const { data: person } = await supabase
      .from('photo_share_people').select('name, email, token').eq('id', personId).maybeSingle()
    if (!person?.email || !person?.token) continue // can't email or can't build the link

    const firstName = (person.name || person.email).trim().split(' ')[0]
    const link = `${process.env.NEXT_PUBLIC_SITE_URL}/gallery/${person.token}`
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Canvas Routes <jerry@canvasroutes.com>',
          to: person.email,
          reply_to: 'jerry@canvasroutes.com',
          subject: personFolders.length === 1
            ? 'Your Canvas Routes photos are removed soon'
            : 'Some of your Canvas Routes photos are removed soon',
          html: buildPhotoExpiryReminderHtml({ firstName, link, folders: personFolders }),
          text: photoExpiryReminderText({ firstName, link, folders: personFolders }),
        }),
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => 'unknown')
        captureMessage(`Photo expiry reminder email failed — ${person.email}`, { response: errText })
        continue // leave unstamped → retried on the next run
      }
      // Stamp only after a confirmed send, so a failure above retries tomorrow.
      const { error: stampErr } = await supabase
        .from('photo_share_folders')
        .update({ reminder_sent_at: new Date().toISOString() })
        .in('id', personFolders.map(f => f.id))
      if (stampErr) captureException(new Error(stampErr.message), { context: 'photo-expiry-reminder-stamp', personId })
      reminded += personFolders.length
      people++
    } catch (err) {
      captureException(err, { context: 'photo-expiry-reminder-email', personId })
    }
  }
  return { reminded, people }
}

// Called by Vercel cron (GET with Authorization: Bearer {CRON_SECRET})
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('Photo expiry reminder cron: CRON_SECRET is not set — endpoint is disabled for safety')
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await sendExpiryReminders()
    return Response.json({ ok: true, ...result })
  } catch (err) {
    console.error('Photo expiry reminder failed:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// Called manually from the admin panel (POST, admin-only) — for testing / an
// on-demand run.
export async function POST() {
  try {
    const user = await requireAdmin()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const result = await sendExpiryReminders()
    return Response.json({ ok: true, ...result })
  } catch (err) {
    console.error('Photo expiry reminder error:', err.message)
    return Response.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
