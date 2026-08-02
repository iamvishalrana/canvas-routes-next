import { after } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { captureException } from '../../../../../lib/sentry'
import { buildAdminNotifyHtml } from '../../../../../lib/adminEmail'

// Called once after a member's upload batch finishes (not per-photo) — fires
// a single admin alert summarizing the whole batch, per the explicit "one
// batched email per upload session" requirement rather than spamming Vishal
// per photo.
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  const body = await request.json().catch(() => ({}))
  const album = (body.album || '').toString().trim()
  const count = Math.max(0, Math.min(20, parseInt(body.count, 10) || 0))
  if (!album || count === 0) return Response.json({ success: true }) // nothing succeeded — no email

  const admin = createAdminClient()
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
