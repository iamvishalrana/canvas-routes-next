import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { checkRateLimit } from '../../../../../../lib/rateLimit'
import { captureException } from '../../../../../../lib/sentry.js'

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// Convert plain text (double-newline paragraphs) to HTML
function textToHtml(text) {
  return text
    .split(/\n\n+/)
    .map(p => `<p style="margin:0 0 1.2em 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#333;">${h(p).replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

function emailHtml({ subject, body, recipientEmail }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${h(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td style="padding:48px 40px 20px;">
        ${textToHtml(body)}
      </td>
    </tr>
    <tr>
      <td style="padding:20px 40px 40px;border-top:0.5px solid rgba(0,0,0,0.08);">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#bbb;line-height:1.6;">
          Canvas Routes &nbsp;&middot;&nbsp; Montreal, QC &nbsp;&middot;&nbsp;
          <a href="mailto:info@canvasroutes.com" style="color:#bbb;">info@canvasroutes.com</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
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
