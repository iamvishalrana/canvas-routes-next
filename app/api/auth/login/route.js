import { createClient } from '../../../../lib/supabase/server'
import { checkRateLimit } from '../../../../lib/rateLimit.js'

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
  if (ip && await checkRateLimit(ip)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const { email, password } = body
  if (!email || !password) return Response.json({ error: 'Email and password required.' }, { status: 400 })
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return Response.json({ error: 'Incorrect email or password.' }, { status: 401 })
  return Response.json({ success: true })
}
