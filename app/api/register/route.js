import { checkRateLimit } from '../../../lib/rateLimit.js'

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#ffffff;">
      <div style="font-family:'Georgia',serif;max-width:560px;margin:0 auto;padding:2rem;background:#fff;color:#1a1a1a;">
        <p style="font-size:12px;color:#888;margin-bottom:1.5rem;text-transform:uppercase;letter-spacing:0.1em;">New member application</p>
        <table style="font-size:14px;line-height:2;width:100%;border-collapse:collapse;">
          <tr><td style="color:#888;width:160px;padding:6px 0;border-bottom:0.5px solid #eee;vertical-align:top;">Full name</td><td style="padding:6px 0;border-bottom:0.5px solid #eee;"><strong>${h(name)}</strong></td></tr>
          <tr><td style="color:#888;padding:6px 0;border-bottom:0.5px solid #eee;vertical-align:top;">Instagram</td><td style="padding:6px 0;border-bottom:0.5px solid #eee;">${h(instagram)}</td></tr>
          ${phone ? `<tr><td style="color:#888;padding:6px 0;border-bottom:0.5px solid #eee;vertical-align:top;">Phone</td><td style="padding:6px 0;border-bottom:0.5px solid #eee;">${h(phone)}</td></tr>` : ''}
          <tr><td style="color:#888;padding:6px 0;border-bottom:0.5px solid #eee;vertical-align:top;">Car</td><td style="padding:6px 0;border-bottom:0.5px solid #eee;">${h(car)}</td></tr>
          <tr><td style="color:#888;padding:6px 0;border-bottom:0.5px solid #eee;vertical-align:top;">About their ride</td><td style="padding:6px 0;border-bottom:0.5px solid #eee;white-space:pre-wrap;">${h(ride)}</td></tr>
          <tr><td style="color:#888;padding:6px 0;vertical-align:top;">Why they want to join</td><td style="padding:6px 0;white-space:pre-wrap;">${h(why)}</td></tr>
        </table>
      </div>
      </body>
      </html>
    `,
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
