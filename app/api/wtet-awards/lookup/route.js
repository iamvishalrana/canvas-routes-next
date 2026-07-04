import { createAdminClient } from '../../../../lib/supabase/admin.js'
import { checkRateLimit } from '../../../../lib/rateLimit.js'
import { normalizeEmail } from '../../../../lib/normalizeEmail.js'
import { normalizeEventName } from '../../../../lib/eventMeta.js'
import { isWtetEventName } from '../../../../lib/wtetRegistrationContent.js'
import { findWtetParticipant } from '../../../../lib/wtetParticipants.js'
import { getEligibleCandidates } from '../../../../lib/wtetAwardsContent.js'

export const runtime = 'nodejs'

// POST { email } — resolve a registrant's email to their canonical participant
// record (so we know who "self" is for the self-vote block), their eligible
// ballot candidates, whether voting is currently open, and any existing vote.
export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim() || 'unknown'
  if (await checkRateLimit(ip, 15, 60)) return Response.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const normalEmail = normalizeEmail(body?.email)
  if (!normalEmail) return Response.json({ error: 'Email is required.' }, { status: 400 })

  const supabase = createAdminClient()

  const [{ data: app }, { data: voteRow }, { data: settingRow }] = await Promise.all([
    supabase.from('applications')
      .select('name, email, stripe_payment_type, stripe_payment_status, registrations')
      .eq('email', normalEmail)
      .maybeSingle(),
    supabase.from('wtet_awards_votes').select('most_beautiful, best_driver, best_energy').eq('email', normalEmail).maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'wtet_awards_open').maybeSingle(),
  ])

  const isStripeWtet = app?.stripe_payment_type === 'road_trip_wtet' && ['paid', 'authorized'].includes(app?.stripe_payment_status)
  const isManualWtet = (app?.registrations || []).some(r => isWtetEventName(normalizeEventName(r.event)))
  if (!app || (!isStripeWtet && !isManualWtet)) return Response.json({ error: 'Not found' }, { status: 404 })

  const participant = findWtetParticipant(app.name)
  if (!participant) {
    return Response.json({ error: "We couldn't match your registration to a car on the list yet — email jerry@canvasroutes.com and he'll sort it out." }, { status: 404 })
  }

  const votingOpen = settingRow?.value === 'true'
  const candidates = getEligibleCandidates(participant.name).map(p => ({ name: p.name, car: p.car, photo: p.photo || null }))

  return Response.json({
    voterName:  participant.name,
    candidates,
    votingOpen,
    existingVote: voteRow || null,
  })
}
