import { checkRateLimit } from '../../../lib/rateLimit'
import { captureException } from '../../../lib/sentry'

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }

  const { name, email, message } = body
  if (!name?.trim() || name.trim().length < 2) return Response.json({ error: 'Please enter your name.' }, { status: 400 })
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'Please enter a valid email.' }, { status: 400 })
  if (name.length > 100 || email.length > 254 || (message && message.length > 1000)) return Response.json({ error: 'Input too long.' }, { status: 400 })

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: 'info@canvasroutes.com',
        reply_to: email.trim(),
        subject: `Website inquiry from ${name.trim()}`,
        text: `Name: ${name.trim()}\nEmail: ${email.trim()}\n\nMessage:\n${message?.trim() || '(no message provided)'}`,
      }),
    })
  } catch (err) {
    captureException(err, { context: 'inquiry-email' })
    return Response.json({ error: 'Could not send message. Please email info@canvasroutes.com directly.' }, { status: 500 })
  }

  return Response.json({ success: true })
}
