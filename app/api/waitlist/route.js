import { checkRateLimit } from '../../../lib/rateLimit.js'

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function customerHtml(firstName) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Application received &#8212; Canvas Routes</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F1EC;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px;width:100%;background-color:#F5F1EC;">

          <tr>
            <td style="padding-bottom:28px;">
              <img src="https://canvasroutes.com/canvas_routes_refined.png" alt="Canvas Routes" width="200" height="133" style="display:block;width:200px;height:auto;border:0;outline:0;" />
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background-color:#c5a882;">&nbsp;</td></tr></table>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:20px;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:300;line-height:38px;color:#1a1a1a;">
              We&#39;ve got your application, ${firstName}.
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:20px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:27px;color:#555555;">
              Thank you for applying to Canvas Routes. We&#39;ve received your application and will review it shortly &#8212; once we do, expect a personal email from our team.
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:32px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:27px;color:#555555;">
              To make sure our reply reaches your inbox, add <a href="mailto:jerry@canvasroutes.com" style="color:#555555;">jerry@canvasroutes.com</a> to your contacts now. In the meantime, follow us on Instagram to stay up to date on everything happening with Canvas Routes.
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:44px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border:1px solid #1a1a1a;">
                    <a href="https://www.instagram.com/canvasroutes" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#1a1a1a;text-decoration:none;">&#64;canvasroutes</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:#aaaaaa;">
              If this email landed in your spam folder, please move it to your inbox and mark it as Not Spam &#8212; so you don&#39;t miss our reply.
            </td>
          </tr>

          <tr>
            <td style="padding-top:20px;border-top:1px solid #ddd8d0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:#aaaaaa;">
              &#169; 2026 Canvas Routes. Montreal, QC.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function customerText(firstName) {
  return `We've got your application, ${firstName}.

Thank you for applying to Canvas Routes. We've received your application and will review it shortly — once we do, expect a personal email from our team.

To make sure our reply reaches your inbox, add jerry@canvasroutes.com to your contacts. In the meantime, follow us on Instagram to stay up to date on everything happening with Canvas Routes:
https://www.instagram.com/canvasroutes

If this email landed in your spam folder, please move it to your inbox and mark it as Not Spam — so you don't miss our reply.

© 2026 Canvas Routes. Montreal, QC.`
}

function notifyHtml({ registerFor, name, email, car, phone, instagram, more, source }) {
  const row = (label, value) => value
    ? `<tr><td width="140" style="width:140px;padding:8px 12px 8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#888888;vertical-align:top;">${label}</td><td style="padding:8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;vertical-align:top;">${value}</td></tr>`
    : ''
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>New application</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px;width:100%;">
          <tr>
            <td style="padding-bottom:20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888888;">
              New application received
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${row('Registering for', registerFor ? `<strong>${h(registerFor)}</strong>` : '')}
                ${row('Full name', `<strong>${h(name)}</strong>`)}
                ${row('Email', `<a href="mailto:${h(email)}" style="color:#1a1a1a;">${h(email)}</a>`)}
                ${row('Car', h(car))}
                ${row('Phone', phone ? h(phone) : '')}
                ${row('Instagram', instagram ? h(instagram) : '')}
                ${row('Tell us more', more ? h(more) : '')}
                ${row('How they heard', source ? h(source) : '')}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(request) {
  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
  if (ip && await checkRateLimit(ip)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { registerFor, name, email, car, more, phone, instagram, source, _hp } = body
  if (_hp) return Response.json({ success: true })

  if (!name?.trim() || !email?.trim() || !car?.trim()) {
    return Response.json({ error: 'Name, email, and car are required' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Invalid email address' }, { status: 400 })
  }
  if (name.length > 100) return Response.json({ error: 'Name too long' }, { status: 400 })
  if (email.length > 254) return Response.json({ error: 'Email too long' }, { status: 400 })
  if (car && car.length > 200) return Response.json({ error: 'Car description too long' }, { status: 400 })
  if (phone && phone.length > 30) return Response.json({ error: 'Phone too long' }, { status: 400 })
  if (instagram && instagram.length > 50) return Response.json({ error: 'Instagram handle too long' }, { status: 400 })
  if (more && more.length > 500) return Response.json({ error: 'Message too long' }, { status: 400 })

  const CC_DEADLINE = new Date('2026-05-09T15:00:00Z').getTime()
  const VALID_REGISTER_FOR = ['Cars & Coffee — May 9, 2026', 'Canvas Routes Membership']
  const VALID_SOURCES = ['Instagram', 'Facebook', 'Friend / Word of mouth', 'Google', 'Other']
  if (!registerFor || !VALID_REGISTER_FOR.includes(registerFor)) {
    return Response.json({ error: 'Invalid registration type' }, { status: 400 })
  }
  if (registerFor === 'Cars & Coffee — May 9, 2026' && Date.now() > CC_DEADLINE) {
    return Response.json({ error: 'Cars & Coffee registration has closed.' }, { status: 400 })
  }
  if (!source || !VALID_SOURCES.includes(source)) {
    return Response.json({ error: 'Invalid source' }, { status: 400 })
  }

  const firstName = h(name.trim().split(' ')[0])
  const rawFirstName = name.trim().split(' ')[0]

  // EMAIL 1 — Customer confirmation
  const customerEmail = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Canvas Routes <info@canvasroutes.com>',
      to: email,
      reply_to: 'info@canvasroutes.com',
      subject: 'Application received — Canvas Routes',
      html: customerHtml(firstName),
      text: customerText(rawFirstName),
    }),
  })

  if (!customerEmail.ok) {
    const err = await customerEmail.text().catch(() => 'unknown')
    console.error('Customer email error:', err)
    return Response.json({ error: 'Failed to send confirmation email' }, { status: 500 })
  }

  // EMAIL 2 — Internal notification (with one retry)
  const notifyBody = JSON.stringify({
    from: 'Canvas Routes <info@canvasroutes.com>',
    to: 'info@canvasroutes.com',
    subject: `New application — ${name.trim()}`,
    html: notifyHtml({ registerFor, name, email, car, phone, instagram, more, source }),
    text: `New application\n\nRegistering for: ${registerFor}\nName: ${name}\nEmail: ${email}\nCar: ${car}${phone ? `\nPhone: ${phone}` : ''}${instagram ? `\nInstagram: ${instagram}` : ''}${more ? `\nMore: ${more}` : ''}\nSource: ${source}`,
  })

  let notifyOk = false
  for (let attempt = 0; attempt < 2; attempt++) {
    const notifyEmail = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: notifyBody,
    })
    if (notifyEmail.ok) { notifyOk = true; break }
    const err = await notifyEmail.text()
    console.error(`Notify email attempt ${attempt + 1} failed:`, err)
  }
  if (!notifyOk) {
    console.error(`ALERT: Notify email failed after retry — application from: ${email}`)
  }

  return Response.json({ success: true })
}
