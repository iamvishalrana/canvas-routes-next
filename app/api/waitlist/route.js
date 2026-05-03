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

  const firstName = h(name.split(' ')[0])

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
      subject: "Application received — Canvas Routes",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#F5F1EC;">
        <div style="font-family:'Georgia',serif;max-width:520px;margin:0 auto;padding:3rem 2rem;background:#F5F1EC;color:#1a1a1a;">

          <div style="margin-bottom:2rem;">
            <img src="https://canvasroutes.com/canvas_routes_refined.png" alt="Canvas Routes" width="240" style="display:block;width:240px;height:auto;" />
          </div>

          <div style="width:40px;height:1px;background:#c5a882;margin-bottom:2rem;"></div>

          <h1 style="font-size:2rem;font-weight:300;line-height:1.2;margin-bottom:1.5rem;color:#1a1a1a;">We&#39;ve got your application, ${firstName}.</h1>

          <p style="font-size:0.95rem;line-height:1.8;color:#555;margin-bottom:1.5rem;">Thank you for applying to Canvas Routes. We've received your application and will review it shortly — we'll be in touch with you as soon as possible.</p>

          <p style="font-size:0.95rem;line-height:1.8;color:#555;margin-bottom:2rem;">In the meantime, follow us on Instagram to stay up to date on everything happening with Canvas Routes.</p>

          <a href="https://www.instagram.com/canvasroutes" style="display:inline-flex;align-items:center;gap:10px;padding:0.9rem 2rem;border:1px solid #1a1a1a;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#1a1a1a;text-decoration:none;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7B2032" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="1" fill="#7B2032" stroke="none"/>
            </svg>
            @canvasroutes
          </a>

          <p style="font-size:11px;color:#aaa;margin-top:3rem;line-height:1.7;">If this email landed in your spam folder, please move it to your inbox and mark it as Not Spam — so you don't miss our reply.</p>

          <div style="padding-top:1.5rem;border-top:0.5px solid rgba(0,0,0,0.1);font-size:11px;color:#aaa;">© 2026 Canvas Routes. Montreal, QC.</div>
        </div>
        </body>
        </html>
      `,
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
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#ffffff;">
      <div style="font-family:'Georgia',serif;max-width:520px;margin:0 auto;padding:2rem;background:#fff;color:#1a1a1a;">
        <p style="font-size:12px;color:#888;margin-bottom:1.5rem;text-transform:uppercase;letter-spacing:0.1em;">New application received</p>
        <table style="font-size:14px;line-height:2;width:100%;border-collapse:collapse;">
          ${registerFor ? `<tr><td style="color:#888;width:140px;padding:6px 0;border-bottom:0.5px solid #eee;">Registering for</td><td style="padding:6px 0;border-bottom:0.5px solid #eee;"><strong>${h(registerFor)}</strong></td></tr>` : ''}
          <tr><td style="color:#888;width:140px;padding:6px 0;border-bottom:0.5px solid #eee;">Full name</td><td style="padding:6px 0;border-bottom:0.5px solid #eee;"><strong>${h(name)}</strong></td></tr>
          <tr><td style="color:#888;padding:6px 0;border-bottom:0.5px solid #eee;">Email</td><td style="padding:6px 0;border-bottom:0.5px solid #eee;"><a href="mailto:${h(email)}">${h(email)}</a></td></tr>
          <tr><td style="color:#888;padding:6px 0;border-bottom:0.5px solid #eee;">Car</td><td style="padding:6px 0;border-bottom:0.5px solid #eee;">${h(car)}</td></tr>
          ${phone ? `<tr><td style="color:#888;padding:6px 0;border-bottom:0.5px solid #eee;">Phone</td><td style="padding:6px 0;border-bottom:0.5px solid #eee;">${h(phone)}</td></tr>` : ''}
          ${instagram ? `<tr><td style="color:#888;padding:6px 0;border-bottom:0.5px solid #eee;">Instagram</td><td style="padding:6px 0;border-bottom:0.5px solid #eee;">${h(instagram)}</td></tr>` : ''}
          ${more ? `<tr><td style="color:#888;vertical-align:top;padding:6px 0;">Tell us more</td><td style="padding:6px 0;">${h(more)}</td></tr>` : ''}
          ${source ? `<tr><td style="color:#888;padding:6px 0;border-bottom:0.5px solid #eee;">How they heard</td><td style="padding:6px 0;border-bottom:0.5px solid #eee;">${h(source)}</td></tr>` : ''}
        </table>
      </div>
      </body>
      </html>
    `,
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
