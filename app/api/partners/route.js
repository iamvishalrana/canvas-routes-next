import { captureException, captureMessage } from '../../../lib/sentry.js'
import { checkRateLimit } from '../../../lib/rateLimit.js'

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const VALID_TYPES = [
  'Cafe or Restaurant', 'Bar or Lounge', 'Photography or Videography',
  'Media or Content', 'Automotive', 'Car Care & Product Brand',
  'Hotel or Hospitality', 'Retail or Lifestyle brand', 'Other',
]

function notifyHtml({ name, business, city, type, email, phone, message }) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0F1E14;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0F1E14;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;">
<tr><td style="padding-bottom:24px;">
  <img src="https://canvasroutes.com/logo-white.png" alt="Canvas Routes" width="180" style="display:block;width:180px;height:auto;"/>
</td></tr>
<tr><td style="padding-bottom:20px;"><table role="presentation" cellpadding="0" cellspacing="0" width="40"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background:#c5a882;">&nbsp;</td></tr></table></td></tr>
<tr><td style="font-family:Georgia,serif;font-size:22px;font-weight:400;color:#F5F1EC;padding-bottom:28px;">
  New partner inquiry
</td></tr>
<tr><td style="background:rgba(255,255,255,0.04);border:0.5px solid rgba(197,168,130,0.2);padding:24px 28px;border-radius:2px;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#c5a882;padding-bottom:4px;">Name</td></tr>
    <tr><td style="font-family:Arial,sans-serif;font-size:14px;color:#F5F1EC;padding-bottom:16px;">${h(name)}</td></tr>
    <tr><td style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#c5a882;padding-bottom:4px;">Business</td></tr>
    <tr><td style="font-family:Arial,sans-serif;font-size:14px;color:#F5F1EC;padding-bottom:16px;">${h(business)}</td></tr>
    <tr><td style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#c5a882;padding-bottom:4px;">City / Town</td></tr>
    <tr><td style="font-family:Arial,sans-serif;font-size:14px;color:#F5F1EC;padding-bottom:16px;">${h(city)}</td></tr>
    <tr><td style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#c5a882;padding-bottom:4px;">Type</td></tr>
    <tr><td style="font-family:Arial,sans-serif;font-size:14px;color:#F5F1EC;padding-bottom:16px;">${h(type)}</td></tr>
    <tr><td style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#c5a882;padding-bottom:4px;">Email</td></tr>
    <tr><td style="font-family:Arial,sans-serif;font-size:14px;padding-bottom:16px;"><a href="mailto:${h(email)}" style="color:#c5a882;text-decoration:none;">${h(email)}</a></td></tr>
    ${phone ? `<tr><td style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#c5a882;padding-bottom:4px;">Phone</td></tr>
    <tr><td style="font-family:Arial,sans-serif;font-size:14px;color:#F5F1EC;padding-bottom:16px;">${h(phone)}</td></tr>` : ''}
    <tr><td style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#c5a882;padding-bottom:4px;">Message</td></tr>
    <tr><td style="font-family:Arial,sans-serif;font-size:14px;color:#F5F1EC;white-space:pre-wrap;line-height:1.7;">${h(message)}</td></tr>
  </table>
</td></tr>
<tr><td style="padding-top:24px;font-family:Arial,sans-serif;font-size:11px;color:rgba(245,241,236,0.3);letter-spacing:0.08em;">
  CANVAS ROUTES — PARTNER INQUIRY
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

function confirmHtml({ name, business }) {
  const firstName = name.split(' ')[0]
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Partner inquiry received — Canvas Routes</title>
</head>
<body style="margin:0;padding:0;background-color:#0F1E14;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F1E14;">
  <tr><td align="center" style="padding:48px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;">

      <!-- Logo -->
      <tr><td style="padding-bottom:36px;">
        <img src="https://canvasroutes.com/logo-white.png" alt="Canvas Routes" width="200" style="display:block;width:200px;height:auto;border:0;"/>
      </td></tr>

      <!-- Gold divider -->
      <tr><td style="padding-bottom:32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40">
          <tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background-color:#c5a882;">&nbsp;</td></tr>
        </table>
      </td></tr>

      <!-- Heading -->
      <tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:#F5F1EC;line-height:1.2;padding-bottom:20px;">
        Inquiry received.
      </td></tr>

      <!-- Body -->
      <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:rgba(245,241,236,0.65);line-height:1.85;padding-bottom:16px;">
        Hi ${h(firstName)},
      </td></tr>
      <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:rgba(245,241,236,0.65);line-height:1.85;padding-bottom:16px;">
        Thank you for reaching out about a partnership with Canvas Routes. We've received your inquiry for <span style="color:#F5F1EC;">${h(business)}</span> and will review it personally.
      </td></tr>
      <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:rgba(245,241,236,0.65);line-height:1.85;padding-bottom:32px;">
        We take care with every partnership — if there's a genuine fit, you'll hear from us within a few days to set up a conversation. In the meantime, feel free to follow us on Instagram at <a href="https://www.instagram.com/canvasroutes" style="color:#c5a882;text-decoration:none;">@canvasroutes</a> to get a feel for what we do.
      </td></tr>

      <!-- Divider -->
      <tr><td style="padding-bottom:28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background-color:rgba(197,168,130,0.18);">&nbsp;</td></tr>
        </table>
      </td></tr>

      <!-- Sign-off -->
      <tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;font-style:italic;color:rgba(245,241,236,0.5);line-height:1.6;padding-bottom:8px;">
        The road is the product. We build the community around it.
      </td></tr>
      <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:rgba(245,241,236,0.3);letter-spacing:0.1em;padding-bottom:36px;">
        CANVAS ROUTES — MONTREAL
      </td></tr>

      <!-- Divider -->
      <tr><td style="padding-bottom:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background-color:rgba(197,168,130,0.12);">&nbsp;</td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(245,241,236,0.22);line-height:1.7;">
        Canvas Routes &nbsp;·&nbsp; Montreal, QC &nbsp;·&nbsp;
        <a href="https://canvasroutes.com" style="color:rgba(245,241,236,0.22);text-decoration:none;">canvasroutes.com</a>
        &nbsp;·&nbsp;
        <a href="mailto:info@canvasroutes.com" style="color:rgba(245,241,236,0.22);text-decoration:none;">info@canvasroutes.com</a>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`
}

export async function POST(req) {
  if (!process.env.RESEND_API_KEY) return Response.json({ error: 'Service unavailable.' }, { status: 503 })
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const limited = await checkRateLimit(`partners:${ip}`, 5, 3600)
  if (limited) return Response.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 })

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }

  const { _hp, name, business, city, type, email, phone, message } = body
  if (_hp) return Response.json({ success: true })

  const n  = String(name     ?? '').trim()
  const b  = String(business ?? '').trim()
  const ci = String(city     ?? '').trim()
  const t  = String(type     ?? '').trim()
  const e  = String(email    ?? '').trim().toLowerCase()
  const p  = String(phone    ?? '').trim()
  const m  = String(message  ?? '').trim()

  if (!n || !b || !ci || !t || !e || !m) return Response.json({ error: 'All fields are required.' }, { status: 400 })
  if (p && p.length > 30) return Response.json({ error: 'Phone number too long.' }, { status: 400 })
  if (!VALID_TYPES.includes(t)) return Response.json({ error: 'Please select a valid business type.' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  if (n.length > 100) return Response.json({ error: 'Name too long.' }, { status: 400 })
  if (b.length > 150) return Response.json({ error: 'Business name too long.' }, { status: 400 })
  if (m.length > 1000) return Response.json({ error: 'Message too long (max 1000 characters).' }, { status: 400 })

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Canvas Routes <noreply@canvasroutes.com>',
        to: 'info@canvasroutes.com',
        replyTo: e,
        subject: `Partner inquiry — ${b}`,
        html: notifyHtml({ name: n, business: b, city: ci, type: t, email: e, phone: p, message: m }),
        text: `Partner Inquiry\n\nName: ${n}\nBusiness: ${b}\nCity: ${ci}\nType: ${t}\nEmail: ${e}${p ? `\nPhone: ${p}` : ''}\n\nMessage:\n${m}`,
      }),
    })
    if (!res.ok) {
      const err = await res.text().catch(() => 'unknown')
      console.error('Partner inquiry email failed:', err)
      captureMessage('Partner inquiry email failed', { name: n, business: b, email: e, err })
    }
  } catch (err) {
    console.error('Partner inquiry email network error:', err)
    captureException(err, { context: 'partner-inquiry-email', email: e })
  }

  // Confirmation email to the partner
  try {
    const confirmRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: e,
        subject: 'Your partnership inquiry — Canvas Routes',
        html: confirmHtml({ name: n, business: b }),
        text: `Hi ${n.split(' ')[0]},\n\nThank you for reaching out about a partnership with Canvas Routes. We've received your inquiry for ${b} and will review it personally.\n\nWe take care with every partnership — if there's a genuine fit, you'll hear from us within a few days.\n\nCanvas Routes\nMontreal, QC\ninfo@canvasroutes.com`,
      }),
    })
    if (!confirmRes.ok) {
      const err = await confirmRes.text().catch(() => 'unknown')
      console.error('Partner confirm email failed:', err)
    }
  } catch (err) {
    console.error('Partner confirm email network error:', err)
    captureException(err, { context: 'partner-confirm-email', email: e })
  }

  return Response.json({ success: true })
}
