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

const VALID_TYPES = ['Photographer', 'Media Outlet', 'Business', 'Sponsor']

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (checkRateLimit(ip)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const body = await request.json()
  const { name, company, type, website, phone, collab } = body

  if (!name?.trim() || name.trim().length < 2) return Response.json({ error: 'Full name is required' }, { status: 400 })
  if (!company?.trim()) return Response.json({ error: 'Company or handle is required' }, { status: 400 })
  if (!type || !VALID_TYPES.includes(type)) return Response.json({ error: 'Please select a valid type' }, { status: 400 })
  if (!collab?.trim()) return Response.json({ error: 'Please tell us how you would like to collaborate' }, { status: 400 })

  if (name.length > 100) return Response.json({ error: 'Name too long' }, { status: 400 })
  if (company.length > 100) return Response.json({ error: 'Company name too long' }, { status: 400 })
  if (website && website.length > 300) return Response.json({ error: 'Website URL too long' }, { status: 400 })
  if (phone && phone.length > 30) return Response.json({ error: 'Phone too long' }, { status: 400 })
  if (collab.length > 1000) return Response.json({ error: 'Response too long' }, { status: 400 })

  const notifyBody = JSON.stringify({
    from: 'Canvas Routes <info@canvasroutes.com>',
    to: 'info@canvasroutes.com',
    subject: `New partner inquiry — ${name.trim()} (${type})`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#ffffff;">
      <div style="font-family:'Georgia',serif;max-width:560px;margin:0 auto;padding:2rem;background:#fff;color:#1a1a1a;">
        <p style="font-size:12px;color:#888;margin-bottom:1.5rem;text-transform:uppercase;letter-spacing:0.1em;">New partner inquiry</p>
        <table style="font-size:14px;line-height:2;width:100%;border-collapse:collapse;">
          <tr><td style="color:#888;width:160px;padding:6px 0;border-bottom:0.5px solid #eee;vertical-align:top;">Full name</td><td style="padding:6px 0;border-bottom:0.5px solid #eee;"><strong>${h(name)}</strong></td></tr>
          <tr><td style="color:#888;padding:6px 0;border-bottom:0.5px solid #eee;vertical-align:top;">Company / Handle</td><td style="padding:6px 0;border-bottom:0.5px solid #eee;">${h(company)}</td></tr>
          <tr><td style="color:#888;padding:6px 0;border-bottom:0.5px solid #eee;vertical-align:top;">Type</td><td style="padding:6px 0;border-bottom:0.5px solid #eee;">${h(type)}</td></tr>
          ${website ? `<tr><td style="color:#888;padding:6px 0;border-bottom:0.5px solid #eee;vertical-align:top;">Website / Portfolio</td><td style="padding:6px 0;border-bottom:0.5px solid #eee;"><a href="${h(website)}">${h(website)}</a></td></tr>` : ''}
          ${phone ? `<tr><td style="color:#888;padding:6px 0;border-bottom:0.5px solid #eee;vertical-align:top;">Phone</td><td style="padding:6px 0;border-bottom:0.5px solid #eee;">${h(phone)}</td></tr>` : ''}
          <tr><td style="color:#888;padding:6px 0;vertical-align:top;">How to collaborate</td><td style="padding:6px 0;white-space:pre-wrap;">${h(collab)}</td></tr>
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
    console.error(`Partners email attempt ${attempt + 1} failed:`, await r.text())
  }
  if (!notifyOk) console.error(`ALERT: Partners notify failed for: ${name}`)

  return Response.json({ success: true })
}
