import { after } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { captureException } from '../../../../../lib/sentry'
import { buildAdminNotifyHtml } from '../../../../../lib/adminEmail'

// Called once after a member's upload batch finishes (not per-photo) — fires
// a single admin alert summarizing the whole batch, per the explicit "one
// batched email per upload session" requirement rather than spamming the
// admin inbox per photo.
//
// The count/album come from the DB, never trusted from the client — a
// client-supplied count could otherwise be used to spam the admin inbox with
// fake "N photos uploaded" alerts without uploading anything. Querying
// pending + not-yet-notified rows also means a batch that never called this
// route (tab closed mid-upload) still gets swept up the next time this
// member submits anything for the same event, since notified_at only gets
// set on rows this call actually includes.
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const album = (body.album || '').toString().trim()
  if (!album) return Response.json({ success: true })

  const admin = createAdminClient()
  const { data: pending } = await admin.from('gallery_photo_submissions')
    .select('id').eq('member_id', user.id).eq('album', album).eq('status', 'pending').is('notified_at', null)
  const ids = (pending || []).map(p => p.id)
  const count = ids.length
  if (count === 0) return Response.json({ success: true }) // nothing new to notify about

  await admin.from('gallery_photo_submissions').update({ notified_at: new Date().toISOString() }).in('id', ids)

  const { data: member } = await admin.from('members').select('name, email').eq('id', user.id).maybeSingle()
  const name = member?.name || member?.email || 'A member'

  if (process.env.RESEND_API_KEY) {
    after(() => Promise.allSettled([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Canvas Routes <info@canvasroutes.com>',
          to: 'jerry@canvasroutes.com',
          subject: `${name} uploaded ${count} photo${count === 1 ? '' : 's'} — ${album}`,
          html: buildAdminNotifyHtml('New photo upload', [
            ['Contributor', name],
            ['Type', 'Member'],
            ['Event', album],
            ['Photos', String(count)],
            ['Review', '<a href="https://www.canvasroutes.com/admin/photos/submissions" style="color:#1a1a1a;">Review in admin →</a>'],
          ]),
        }),
      }).catch(err => captureException(err, { context: 'member-gallery-submission-admin-email' })),
    ]))
  }

  return Response.json({ success: true })
}
