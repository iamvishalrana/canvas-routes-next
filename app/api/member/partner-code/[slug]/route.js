import { createClient } from '../../../../../lib/supabase/server'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { captureException } from '../../../../../lib/sentry'
import { PARTNERS } from '../../../../../lib/partners'

export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  const { slug } = await params
  const partner = PARTNERS.find(p => p.slug === slug && p.hasCode)
  if (!partner) return Response.json({ error: 'Unknown partner.' }, { status: 404 })

  const admin = createAdminClient()
  const { data: member } = await admin.from('members').select('tier').eq('id', user.id).maybeSingle()
  if (!member) return Response.json({ error: 'Member profile not found.' }, { status: 404 })

  // Same eligibility rule as the perks page: Inner Circle sees everything,
  // Routes Member only sees partners that list them explicitly.
  const isInnerCircle = member.tier === 'inner_circle'
  if (!isInnerCircle && !partner.tiers.includes('Routes Member')) {
    return Response.json({ error: 'Not eligible for this perk.' }, { status: 403 })
  }

  const { data: code, error: rpcErr } = await admin.rpc('claim_partner_code', {
    p_partner_slug: slug, p_member_id: user.id,
  })
  if (rpcErr) {
    captureException(new Error(rpcErr.message), { context: 'partner-code-claim', slug })
    return Response.json({ error: 'Could not get your code. Please try again.' }, { status: 500 })
  }
  if (!code) return Response.json({ error: 'All codes for this partner have been claimed — check back soon.' }, { status: 409 })

  return Response.json({ code })
}
