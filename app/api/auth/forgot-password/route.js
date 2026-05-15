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
  const { email } = body
  if (!email?.trim()) return Response.json({ error: 'Email required.' }, { status: 400 })
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/members/reset-password`,
  })
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ success: true })
}
