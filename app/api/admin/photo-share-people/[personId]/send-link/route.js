import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { captureException, captureMessage } from '../../../../../../lib/sentry'
import { checkRateLimit, getClientIp } from '../../../../../../lib/rateLimit'
import { buildPhotoShareNotifyHtml, photoShareNotifyText } from '../../../../../../lib/photoShareNotifyEmail'

// Sends the person's own gallery link to their email — a convenience for the
// admin so they don't have to copy the link and switch to their own email
// client every time a new folder is added.
export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 200, 60)) return Response.json({ error: 'Too many requests' }, { status: 429 })

  const { personId } = await params
  const admin = createAdminClient()
  const { data: person } = await admin.from('photo_share_people').select('name, email, token').eq('id', personId).maybeSingle()
  if (!person) return Response.json({ error: 'Person not found.' }, { status: 404 })

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'Email is not configured (RESEND_API_KEY missing).' }, { status: 503 })
  }

  const firstName = (person.name || person.email).trim().split(' ')[0]
  const link = `${process.env.NEXT_PUBLIC_SITE_URL}/gallery/${person.token}`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Canvas Routes <jerry@canvasroutes.com>',
        to: person.email,
        reply_to: 'jerry@canvasroutes.com',
        subject: 'Your Canvas Routes Photos',
        html: buildPhotoShareNotifyHtml({ firstName, link }),
        text: photoShareNotifyText({ firstName, link }),
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown')
      captureMessage(`Photo share send-link email failed — ${person.email}`, { response: errText })
      return Response.json({ error: 'Email failed to send. Check Sentry, or copy the link manually.' }, { status: 500 })
    }
  } catch (err) {
    captureException(err, { context: 'photo-share-send-link-email', email: person.email })
    return Response.json({ error: 'Email failed to send. Check Sentry, or copy the link manually.' }, { status: 500 })
  }

  return Response.json({ success: true })
}
