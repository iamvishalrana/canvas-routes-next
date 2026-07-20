import { createClient } from '../../../../lib/supabase/server'
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit.js'

export async function POST(request) {
  const ip = getClientIp(request)
  if (await checkRateLimit(ip)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const { email, password } = body
  if (!email || !password) return Response.json({ error: 'Email and password required.' }, { status: 400 })
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    const msg = error.message?.toLowerCase() ?? ''
    if (msg.includes('email not confirmed')) return Response.json({ error: 'Please confirm your email address before signing in.' }, { status: 401 })
    if (msg.includes('too many requests') || error.status === 429) return Response.json({ error: 'Too many attempts. Please wait a moment and try again.' }, { status: 429 })
    return Response.json({ error: 'Incorrect email or password.' }, { status: 401 })
  }
  const user = data.user
  const { data: member } = await supabase.from('members').select('id').eq('id', user.id).maybeSingle()
  if (!member) {
    await supabase.auth.signOut()
    return Response.json({ error: 'No membership found for this account.' }, { status: 403 })
  }
  return Response.json({ success: true })
}
