import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { checkRateLimit, getClientIp } from '../../../../../../lib/rateLimit'
import { captureException } from '../../../../../../lib/sentry.js'
import { buildPlainEmailShell } from '../../../../../../lib/emailSignature.js'
import { escapeEmail } from '../../../../../../lib/emailLayout.js'

// Convert plain text (double-newline paragraphs) to HTML. Uses the same
// plain, signature-bearing shell as the Broadcasts tool's own personal-note
// emails (lib/emailSignature.js) — this is a free-form message typed by an
// admin, not an official transactional send, so the branded masthead in
// lib/emailLayout.js's emailShell() would read as an odd mismatch here.
function textToHtml(text) {
  return text
    .split(/\n\n+/)
    .map(para => `<p style="margin:0 0 1.2em 0;font-family:inherit;font-size:15px;line-height:1.85;color:#333;">${escapeEmail(para).replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

function emailHtml({ body }) {
  return buildPlainEmailShell(textToHtml(body))
}

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 60, 60)) return Response.json({ error: 'Too many requests' }, { status: 429 })

  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })

  const { subject, body } = await request.json()
  if (!subject?.trim()) return Response.json({ error: 'Subject is required' }, { status: 400 })
  if (!body?.trim()) return Response.json({ error: 'Body is required' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: app, error: fetchErr } = await supabase
    .from('applications')
    .select('email, name')
    .eq('id', id)
    .single()

  if (fetchErr || !app) return Response.json({ error: 'Application not found' }, { status: 404 })
  if (!app.email) return Response.json({ error: 'Application has no email address' }, { status: 400 })

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ success: true, warning: 'Email not sent: RESEND_API_KEY is not configured' })
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Jerry — Canvas Routes <jerry@canvasroutes.com>',
        to: app.email,
        reply_to: 'jerry@canvasroutes.com',
        subject: subject.trim(),
        html: emailHtml({ subject: subject.trim(), body: body.trim(), recipientEmail: app.email }),
        text: body.trim() + '\n\n—\nCanvas Routes · Montreal, QC\ninfo@canvasroutes.com',
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown')
      console.error('Send email error:', errText)
      return Response.json({ error: process.env.NODE_ENV === 'development' ? errText : 'Failed to send email.' }, { status: 500 })
    }
  } catch (err) {
    console.error('Send email network error:', err)
    captureException(err, { context: 'admin-send-email', appId: id })
    return Response.json({ error: 'Failed to send email.' }, { status: 500 })
  }

  return Response.json({ success: true })
}
