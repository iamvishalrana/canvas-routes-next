import { kv } from '@vercel/kv'
import { checkRateLimit } from '../../../lib/rateLimit.js'

const CAR_CAP = 15
const ROADTRIP_KEY = 'reg:routes'

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function customerHtml(firstName, payment) {
  const paymentBlock = payment === 'E-transfer'
    ? `Send <strong>$200</strong> via e-transfer to <a href="mailto:info@canvasroutes.com" style="color:#1a1a1a;">info@canvasroutes.com</a> with your name and car in the message.`
    : `We'll send you a secure Stripe payment link within 24 hours.`

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Registration received &#8212; Canvas Routes</title>
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
              Into the Laurentians &mdash; Canvas Routes
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:300;line-height:38px;color:#1a1a1a;">
              You&apos;re registered, ${firstName}.
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:27px;color:#555555;">
              We&apos;ve received your registration for <strong>Into the Laurentians</strong> &mdash; Cars, Coffee &amp; Cruise. Your spot is held for 48 hours pending payment.
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e0dbd3;">
                <tr>
                  <td style="padding:20px 24px;background-color:#ffffff;">
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#888888;margin-bottom:10px;">Payment — $200 per car</div>
                    <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.7;color:#1a1a1a;">${paymentBlock}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:27px;color:#555555;">
              Once payment is received, we&apos;ll confirm your spot and send event details closer to the date.
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
              If this email landed in your spam folder, please move it to your inbox and mark it as Not Spam.
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

function customerText(firstName, payment) {
  const paymentLine = payment === 'E-transfer'
    ? `Send $200 via e-transfer to info@canvasroutes.com — include your name and car in the message.`
    : `We'll send you a secure Stripe payment link within 24 hours.`
  return `You're registered, ${firstName}.

We've received your registration for Into the Laurentians — Cars, Coffee & Cruise. Your spot is held for 48 hours pending payment.

Payment — $200 per car
${paymentLine}

Once payment is received, we'll confirm your spot and send event details closer to the date.

Follow us on Instagram: https://www.instagram.com/canvasroutes

© 2026 Canvas Routes. Montreal, QC.`
}

function notifyHtml({ regCount, name, email, phone, year, carModel, passengers, hasChildren, childrenAges, source, more, payment }) {
  const row = (label, value) => value
    ? `<tr><td width="160" style="width:160px;padding:8px 12px 8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#888888;vertical-align:top;">${label}</td><td style="padding:8px 0;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;vertical-align:top;">${value}</td></tr>`
    : ''
  const childrenDisplay = hasChildren === 'yes'
    ? `Yes — ages: ${h(childrenAges || 'not provided')}`
    : 'No'
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><title>Road Trip Registration</title></head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px;width:100%;">
          <tr>
            <td style="padding-bottom:20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888888;">
              Into the Laurentians Registration${regCount ? ` &mdash; <strong style="color:#1a1a1a;">#${regCount}</strong>` : ''}
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${row('Full name', `<strong>${h(name)}</strong>`)}
                ${row('Email', `<a href="mailto:${h(email)}" style="color:#1a1a1a;">${h(email)}</a>`)}
                ${row('Phone', h(phone))}
                ${row('Year', h(year))}
                ${row('Make & Model', h(carModel))}
                ${row('Passengers', h(passengers))}
                ${row('Children', childrenDisplay)}
                ${row('How they heard', h(source))}
                ${row('Tell us more', more ? h(more) : '')}
                ${row('Payment preference', h(payment))}
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

export async function GET() {
  if (!process.env.KV_REST_API_URL) return Response.json({ count: 0, soldOut: false })
  try {
    const count = await kv.get(ROADTRIP_KEY)
    const n = Number(count) || 0
    return Response.json({ count: n, soldOut: n >= CAR_CAP })
  } catch {
    return Response.json({ count: 0, soldOut: false })
  }
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

  const { name, email, phone, year, carModel, passengers, hasChildren, childrenAges, source, more, payment, _hp } = body
  if (_hp) return Response.json({ success: true })

  if (!name?.trim() || name.trim().length < 2 || !email?.trim() || !phone?.trim() || !year?.trim() || !carModel?.trim()) {
    return Response.json({ error: 'Please fill in all required fields.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Invalid email address.' }, { status: 400 })
  }
  if (!passengers || !['1','2','3','4+'].includes(passengers)) {
    return Response.json({ error: 'Please select number of passengers.' }, { status: 400 })
  }
  if (!hasChildren || !['yes','no'].includes(hasChildren)) {
    return Response.json({ error: 'Please answer the children question.' }, { status: 400 })
  }
  if (!source || !['Instagram','Facebook','Friend / Word of mouth','Google','Other'].includes(source)) {
    return Response.json({ error: 'Please select how you heard about us.' }, { status: 400 })
  }
  if (!payment || !['E-transfer','Stripe'].includes(payment)) {
    return Response.json({ error: 'Please select a payment preference.' }, { status: 400 })
  }
  if (name.length > 100) return Response.json({ error: 'Name too long.' }, { status: 400 })
  if (email.length > 254) return Response.json({ error: 'Email too long.' }, { status: 400 })
  if (carModel.length > 100) return Response.json({ error: 'Car model too long.' }, { status: 400 })

  // Check cap
  let regCount = null
  if (process.env.KV_REST_API_URL) {
    try {
      const current = await kv.get(ROADTRIP_KEY)
      if (Number(current) >= CAR_CAP) {
        return Response.json({ error: 'Sorry, all spots have been claimed.', soldOut: true }, { status: 409 })
      }
      regCount = await kv.incr(ROADTRIP_KEY)
      if (regCount > CAR_CAP) {
        await kv.decr(ROADTRIP_KEY)
        return Response.json({ error: 'Sorry, all spots have been claimed.', soldOut: true }, { status: 409 })
      }
    } catch (err) {
      console.error('KV error:', err)
    }
  }

  const firstName = h(name.trim().split(' ')[0])
  const rawFirstName = name.trim().split(' ')[0]

  // EMAIL 1 — Customer confirmation
  const customerEmail = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Canvas Routes <info@canvasroutes.com>',
      to: email,
      reply_to: 'info@canvasroutes.com',
      subject: 'Registration received — Into the Laurentians',
      html: customerHtml(firstName, payment),
      text: customerText(rawFirstName, payment),
    }),
  })

  if (!customerEmail.ok) {
    const err = await customerEmail.text().catch(() => 'unknown')
    console.error('Customer email error:', err)
    return Response.json({ error: 'Failed to send confirmation email.' }, { status: 500 })
  }

  // EMAIL 2 — Internal notification
  const notifyBody = JSON.stringify({
    from: 'Canvas Routes <info@canvasroutes.com>',
    to: 'info@canvasroutes.com',
    subject: `Laurentians Registration${regCount ? ` #${regCount}` : ''} — ${year} ${carModel} — ${name.trim()}`,
    html: notifyHtml({ regCount, name, email, phone, year, carModel, passengers, hasChildren, childrenAges, source, more, payment }),
    text: `Laurentians Registration${regCount ? ` #${regCount}` : ''}\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nYear: ${year}\nMake & Model: ${carModel}\nPassengers: ${passengers}\nChildren: ${hasChildren === 'yes' ? `Yes — ${childrenAges}` : 'No'}\nHow they heard: ${source}${more ? `\nTell us more: ${more}` : ''}\nPayment: ${payment}`,
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
    console.error(`ALERT: Notify email failed after retry — registration from: ${email}`)
  }

  // Google Sheets webhook
  if (process.env.SHEETS_WEBHOOK_URL) {
    await fetch(process.env.SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        formType: 'Into the Laurentians',
        name,
        email,
        phone: phone || '',
        year: year || '',
        carModel: carModel || '',
        passengers: passengers || '',
        children: hasChildren === 'yes' ? `Yes — ${childrenAges}` : 'No',
        source,
        more: more || '',
        payment,
      }),
    }).catch(err => console.error('Sheets webhook error:', err))
  }

  return Response.json({ success: true })
}
