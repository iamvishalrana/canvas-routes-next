import { captureException, captureMessage } from '../../../../../../lib/sentry.js'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { checkRateLimit, getClientIp } from '../../../../../../lib/rateLimit'
import { buildMemberPhotoNotifyHtml, memberPhotoNotifyText } from '../../../../../../lib/memberPhotoNotifyEmail.js'

// Manual "let them know" button for a member's Car & Personal folder in
// app/admin/photos/PhotosClient.jsx — the member-side counterpart of
// non-members' existing "Email link to them" (send-link route).
export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 200, 60)) return Response.json({ error: 'Too many requests' }, { status: 429 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: member, error: memberErr } = await supabase.from('members').select('email, name').eq('id', id).single()
  if (memberErr || !member) return Response.json({ error: 'Member not found' }, { status: 404 })

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'Email is not configured (RESEND_API_KEY missing).' }, { status: 503 })
  }

  const firstName = (member.name || member.email).trim().split(' ')[0]
  const link = `${process.env.NEXT_PUBLIC_SITE_URL}/members/photos`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Canvas Routes <jerry@canvasroutes.com>',
        to: member.email,
        reply_to: 'jerry@canvasroutes.com',
        subject: 'New Photos — Canvas Routes',
        html: buildMemberPhotoNotifyHtml({ firstName, link }),
        text: memberPhotoNotifyText({ firstName, link }),
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown')
      captureMessage(`Member photo-notify email failed — ${member.email}`, { response: errText })
      return Response.json({ error: 'Email failed to send. Check Sentry.' }, { status: 500 })
    }
  } catch (err) {
    captureException(err, { context: 'member-notify-photos-email', email: member.email })
    return Response.json({ error: 'Email failed to send. Check Sentry.' }, { status: 500 })
  }

  return Response.json({ success: true })
}
