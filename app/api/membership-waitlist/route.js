import { checkRateLimit } from '../../../lib/rateLimit.js'

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function confirmHtml(firstName) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Membership interest received — Canvas Routes</title>
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
            <td style="padding-bottom:8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888888;">
              Membership &mdash; Canvas Routes
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:300;line-height:38px;color:#1a1a1a;">
              We&apos;ve got you, ${firstName}.
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:27px;color:#555555;">
              Your membership interest has been received. We&apos;ll be in touch once memberships open for the 2026 season.
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e0dbd3;">
                <tr>
                  <td style="padding:20px 24px;background-color:#ffffff;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#888888;margin-bottom:10px;">What happens next</div>
                    <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.7;color:#1a1a1a;">We&apos;ll reach out before memberships open to the public. Spots are limited for the 2026 season.</div>
                  </td>
                </tr>
              </table>
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

function notifyHtml({ name, email, phone, year, carModel, tier, source, more }) {
  const row = (label, value) => value
    ? `<tr><td width="160" style="width:160px;padding:8px 12px 8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#888888;vertical-align:top;">${label}</td><td style="padding:8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;vertical-align:top;">${value}</td></tr>`
    : ''
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><title>Membership Registration</title></head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px;width:100%;">
          <tr><td style="padding-bottom:20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888888;">Membership Registration</td></tr>
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${row('Full name', `<strong>${h(name)}</strong>`)}
                ${row('Email', `<a href="mailto:${h(email)}" style="color:#1a1a1a;">${h(email)}</a>`)}
                ${row('Phone', phone ? h(phone) : '—')}
                ${row('Year', h(year))}
                ${row('Car', h(carModel))}
                ${row('Tier', h(tier))}
                ${row('How they heard', h(source))}
                ${row('Message', more ? h(more) : '')}
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

  const { name, email, phone, year, carMake, carModel, tier, source, more, _hp } = body
  if (_hp) return Response.json({ success: true })

  if (!name?.trim() || name.trim().length < 2)
    return Response.json({ error: 'Please enter your full name.' }, { status: 400 })
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  if (!year?.trim())
    return Response.json({ error: 'Please enter your car year.' }, { status: 400 })
  if (!carMake?.trim())
    return Response.json({ error: 'Please select your car make.' }, { status: 400 })
  if (!tier || !['Routes Member', 'Inner Circle'].includes(tier))
    return Response.json({ error: 'Please select a membership tier.' }, { status: 400 })
  if (!source || !['Instagram','Facebook','Friend / Word of mouth','Google','Other'].includes(source))
    return Response.json({ error: 'Please select how you heard about us.' }, { status: 400 })
  if (name.length > 100) return Response.json({ error: 'Name too long.' }, { status: 400 })
  if (email.length > 254) return Response.json({ error: 'Email too long.' }, { status: 400 })
  if (phone && phone.length > 30) return Response.json({ error: 'Phone too long.' }, { status: 400 })
  if (more && more.length > 500) return Response.json({ error: 'Message too long.' }, { status: 400 })

  const firstName = h(name.trim().split(' ')[0])
  const fullCar = [carMake, carModel].filter(Boolean).join(' ')

  // Confirmation email to applicant
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: email,
        reply_to: 'info@canvasroutes.com',
        subject: 'Membership interest received — Canvas Routes',
        html: confirmHtml(firstName),
        text: `We've got you, ${name.trim().split(' ')[0]}.\n\nYour membership interest has been received. We'll be in touch once memberships open for the 2026 season.\n\nSpots are limited — we'll reach out before we open to the public.\n\n© 2026 Canvas Routes. Montreal, QC.`,
      }),
    })
    if (!res.ok) {
      const err = await res.text().catch(() => 'unknown')
      console.error('Membership confirm email error:', err)
      return Response.json({ error: 'Failed to send confirmation email.' }, { status: 500 })
    }
  } catch (err) {
    console.error('Membership confirm email network error:', err)
    return Response.json({ error: 'Failed to send confirmation email.' }, { status: 500 })
  }

  // Notification email to admin
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: 'info@canvasroutes.com',
        subject: `Membership Registration — ${tier} — ${name.trim()}`,
        html: notifyHtml({ name, email, phone, year, carModel: fullCar, tier, source, more }),
        text: `Membership Registration\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || '—'}\nYear: ${year}\nCar: ${fullCar}\nTier: ${tier}\nHow they heard: ${source}${more ? `\nMessage: ${more}` : ''}`,
      }),
    })
  } catch (err) {
    console.error('Membership notify email error:', err)
  }

  return Response.json({ success: true })
}
