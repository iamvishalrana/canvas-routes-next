import { createAdminClient } from '../../../../lib/supabase/admin'
import { checkRateLimit } from '../../../../lib/rateLimit'
import { normalizeEmail } from '../../../../lib/normalizeEmail'

// Live check while typing in the interest sheet: does this email belong to a
// member account? Boolean only — same low-sensitivity stance as the event
// check-in lookups. Rate-limited against enumeration sweeps.
export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (await checkRateLimit(ip, 20, 60)) return Response.json({ member: false })

  let body
  try { body = await request.json() } catch { return Response.json({ member: false }) }
  const email = normalizeEmail(body.email)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ member: false })

  const supabase = createAdminClient()
  const { data } = await supabase.from('members').select('id').eq('email', email).maybeSingle()
  return Response.json({ member: !!data })
}
