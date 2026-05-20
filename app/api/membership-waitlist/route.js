import { checkRateLimit } from '../../../lib/rateLimit.js'

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

  const { email, _hp } = body
  if (_hp) return Response.json({ success: true })

  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (email.length > 254) {
    return Response.json({ error: 'Email too long.' }, { status: 400 })
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: 'info@canvasroutes.com',
        subject: `Membership Waitlist — ${email.trim()}`,
        text: `New membership waitlist signup:\n\n${email.trim()}`,
      }),
    })
  } catch (err) {
    console.error('Membership waitlist email error:', err)
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }

  return Response.json({ success: true })
}
