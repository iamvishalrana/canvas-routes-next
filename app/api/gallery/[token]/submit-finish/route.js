import { after } from 'next/server'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'
import { readSession } from '../../../../../lib/otp'
import { captureException } from '../../../../../lib/sentry'
import { buildAdminNotifyHtml } from '../../../../../lib/adminEmail'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Called once after a non-member's upload batch finishes — one admin alert
// per session, not per photo, matching the member-side flow's finish route.
export async function POST(request, { params }) {
  const { token } = await params
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })
  if (!UUID_RE.test(token)) return Response.json({ error: 'Not found.' }, { status: 404 })

  const { sessionId, folderId, count } = await request.json().catch(() => ({}))
  const email = await readSession(token, sessionId)
  if (!email) return Response.json({ error: 'Session expired.' }, { status: 401 })

  const admin = createAdminClient()
  const { data: person } = await admin.from('photo_share_people').select('id, name, email').eq('token', token).maybeSingle()
  if (!person || normalizeEmail(person.email) !== email) return Response.json({ error: 'Session expired.' }, { status: 401 })

  const { data: folder } = await admin.from('photo_share_folders').select('title').eq('id', folderId).eq('person_id', person.id).maybeSingle()

  const n = Math.max(0, Math.min(20, parseInt(count, 10) || 0))
  if (n === 0) return Response.json({ success: true })

  const name = person.name || person.email
  const folderTitle = folder?.title || 'General'

  if (process.env.RESEND_API_KEY) {
    after(() => Promise.allSettled([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Canvas Routes <info@canvasroutes.com>',
          to: 'jerry@canvasroutes.com',
          subject: `${name} uploaded ${n} photo${n === 1 ? '' : 's'} — ${folderTitle}`,
          html: buildAdminNotifyHtml('New photo upload', [
            ['Contributor', name],
            ['Type', 'Non-member'],
            ['Folder', folderTitle],
            ['Photos', String(n)],
            ['Review', '<a href="https://www.canvasroutes.com/admin/photos/submissions" style="color:#1a1a1a;">Review in admin →</a>'],
          ]),
        }),
      }).catch(err => captureException(err, { context: 'gallery-submit-finish-admin-email' })),
    ]))
  }

  return Response.json({ success: true })
}
