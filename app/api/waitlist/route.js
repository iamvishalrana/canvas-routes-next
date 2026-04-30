const rateLimit = new Map()
const WINDOW_MS = 60 * 1000
const MAX_REQUESTS = 3

function checkRateLimit(ip) {
  const now = Date.now()
  if (rateLimit.size > 500) {
    for (const [key, val] of rateLimit) {
      if (now > val.resetAt) rateLimit.delete(key)
    }
  }
  const entry = rateLimit.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  if (entry.count >= MAX_REQUESTS) return true
  entry.count++
  return false
}

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (checkRateLimit(ip)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const body = await request.json()
  const { name, email, car, more, phone, instagram, source } = body

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

  const firstName = h(name.split(' ')[0])

  // EMAIL 1 — Customer confirmation
  const customerEmail = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Canvas Routes <join@canvasroutes.com>',
      to: email,
      reply_to: 'info@canvasroutes.com',
      subject: "You're on the list — Canvas Routes",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#F5F1EC;">
        <div style="font-family:'Georgia',serif;max-width:520px;margin:0 auto;padding:3rem 2rem;background:#F5F1EC;color:#1a1a1a;">

          <div style="margin-bottom:2rem;">
            <img src="https://canvasroutes.com/canvas_routes_refined.png" alt="Canvas Routes" width="240" style="display:block;width:240px;height:auto;" />
          </div>

          <div style="width:40px;height:1px;background:#c5a882;margin-bottom:2rem;"></div>

          <h1 style="font-size:2rem;font-weight:300;line-height:1.2;margin-bottom:1.5rem;color:#1a1a1a;">You&#39;re on the list, ${firstName}.</h1>

          <p style="font-size:0.95rem;line-height:1.8;color:#555;margin-bottom:1.5rem;">Thank you for your interest in Canvas Routes. We're building something special for Montreal's automotive community — curated drives, private meets, and unforgettable routes.</p>

          <p style="font-size:0.95rem;line-height:1.8;color:#555;margin-bottom:2rem;">We'll be in touch when spots open. In the meantime, follow us on Instagram and Facebook for a preview of what's coming.</p>

          ${car ? `<p style="font-size:0.85rem;color:#888;margin-bottom:1.5rem;">What you drive: <strong style="color:#1a1a1a;">${h(car)}</strong></p>` : ''}

          <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:0.5rem;">
            <a href="https://www.instagram.com/canvasroutes" style="display:inline-flex;align-items:center;gap:10px;padding:0.9rem 2rem;border:1px solid #1a1a1a;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#1a1a1a;text-decoration:none;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7B2032" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="1" fill="#7B2032" stroke="none"/>
              </svg>
              Instagram
            </a>
            <a href="https://www.facebook.com/share/1B8GXiPHUe/" style="display:inline-flex;align-items:center;gap:10px;padding:0.9rem 2rem;border:1px solid #1a1a1a;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#1a1a1a;text-decoration:none;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7B2032" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
              Facebook
            </a>
          </div>

          <p style="font-size:11px;color:#aaa;margin-top:3rem;line-height:1.7;">If this email landed in your spam folder, please move it to your inbox and mark it as Not Spam — so you don't miss updates from us.</p>

          <div style="padding-top:1.5rem;border-top:0.5px solid rgba(0,0,0,0.1);font-size:11px;color:#aaa;">© 2026 Canvas Routes. Montreal, QC.</div>
        </div>
        </body>
        </html>
      `,
    }),
  })

  if (!customerEmail.ok) {
    const err = await customerEmail.text()
    console.error('Customer email error:', err)
    return Response.json({ error: 'Failed to send confirmation email' }, { status: 500 })
  }

  // EMAIL 2 — Internal notification (with one retry)
  const notifyBody = JSON.stringify({
    from: 'Canvas Routes <join@canvasroutes.com>',
    to: 'join@canvasroutes.com',
    subject: `New application — ${name.trim()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#ffffff;">
      <div style="font-family:'Georgia',serif;max-width:520px;margin:0 auto;padding:2rem;background:#fff;color:#1a1a1a;">
        <p style="font-size:12px;color:#888;margin-bottom:1.5rem;text-transform:uppercase;letter-spacing:0.1em;">New application received</p>
        <table style="font-size:14px;line-height:2;width:100%;border-collapse:collapse;">
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
