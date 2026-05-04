import { checkRateLimit } from '../../../lib/rateLimit.js'

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function notifyHtml({ name, instagram, phone, car, ride, why }) {
  const row = (label, value) => value
    ? `<tr><td width="160" style="width:160px;padding:8px 12px 8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#888888;vertical-align:top;">${label}</td><td style="padding:8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;vertical-align:top;white-space:pre-wrap;">${value}</td></tr>`
    : ''
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>New member application</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px;width:100%;">
          <tr>
            <td style="padding-bottom:20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888888;">
              New member application
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${row('Full name', `<strong>${h(name)}</strong>`)}
                ${row('Instagram', h(instagram))}
                ${row('Phone', phone ? h(phone) : '')}
                ${row('Car', h(car))}
                ${row('About their ride', h(ride))}
                ${row('Why they want to join', h(why))}
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
  const { name, instagram, phone, car, ride, why, _hp } = body
  if (_hp) return Response.json({ success: true })

  if (!name?.trim() || name.trim().length < 2) return Response.json({ error: 'Full name is required' }, { status: 400 })
  if (!instagram?.trim()) return Response.json({ error: 'Instagram handle is required' }, { status: 400 })
  if (!car?.trim()) return Response.json({ error: 'Car information is required' }, { status: 400 })
  if (!ride?.trim()) return Response.json({ error: '"Tell us about your ride" is required' }, { status: 400 })
  if (!why?.trim()) return Response.json({ error: 'Please tell us why you want to join' }, { status: 400 })

  if (name.length > 100) return Response.json({ error: 'Name too long' }, { status: 400 })
  if (instagram.length > 50) return Response.json({ error: 'Instagram handle too long' }, { status: 400 })
  if (phone && phone.length > 30) return Response.json({ error: 'Phone too long' }, { status: 400 })
  if (car.length > 200) return Response.json({ error: 'Car description too long' }, { status: 400 })
  if (ride.length > 1000) return Response.json({ error: 'Response too long' }, { status: 400 })
  if (why.length > 1000) return Response.json({ error: 'Response too long' }, { status: 400 })

  const notifyBody = JSON.stringify({
    from: 'Canvas Routes <info@canvasroutes.com>',
    to: 'info@canvasroutes.com',
    subject: `New member application — ${name.trim()}`,
    html: notifyHtml({ name, instagram, phone, car, ride, why }),
    text: `New member application\n\nFull name: ${name}\nInstagram: ${instagram}${phone ? `\nPhone: ${phone}` : ''}\nCar: ${car}\nAbout their ride: ${ride}\nWhy they want to join: ${why}`,
  })

  let notifyOk = false
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: notifyBody,
    })
    if (r.ok) { notifyOk = true; break }
    console.error(`Register email attempt ${attempt + 1} failed:`, await r.text())
  }
  if (!notifyOk) console.error(`ALERT: Register notify failed for: ${name}`)

  return Response.json({ success: true })
}
