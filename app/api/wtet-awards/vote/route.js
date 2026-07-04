import { createAdminClient } from '../../../../lib/supabase/admin.js'
import { checkRateLimit } from '../../../../lib/rateLimit.js'
import { normalizeEmail } from '../../../../lib/normalizeEmail.js'
import { normalizeEventName } from '../../../../lib/eventMeta.js'
import { isWtetEventName } from '../../../../lib/wtetRegistrationContent.js'
import { findWtetParticipant, normalizeName } from '../../../../lib/wtetParticipants.js'
import { WTET_AWARD_CATEGORIES, isEligibleCandidateName } from '../../../../lib/wtetAwardsContent.js'

export const runtime = 'nodejs'

// POST { email, most_beautiful, best_driver, best_energy } — one ballot per
// registrant email, upserted on resubmit so people can fix a mis-click.
export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim() || 'unknown'
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const normalEmail = normalizeEmail(body?.email)
  if (!normalEmail) return Response.json({ error: 'Email is required.' }, { status: 400 })

  const supabase = createAdminClient()

  const [{ data: app }, { data: settingRow }] = await Promise.all([
    supabase.from('applications')
      .select('name, email, stripe_payment_type, stripe_payment_status, registrations')
      .eq('email', normalEmail)
      .maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'wtet_awards_open').maybeSingle(),
  ])

  const isStripeWtet = app?.stripe_payment_type === 'road_trip_wtet' && ['paid', 'authorized'].includes(app?.stripe_payment_status)
  const isManualWtet = (app?.registrations || []).some(r => isWtetEventName(normalizeEventName(r.event)))
  if (!app || (!isStripeWtet && !isManualWtet)) return Response.json({ error: 'Not found' }, { status: 404 })

  if (settingRow?.value !== 'true') return Response.json({ error: 'Voting is closed.' }, { status: 400 })

  const participant = findWtetParticipant(app.name)
  if (!participant) {
    return Response.json({ error: "We couldn't match your registration to a car on the list yet — email jerry@canvasroutes.com and he'll sort it out." }, { status: 404 })
  }

  const picks = {}
  for (const cat of WTET_AWARD_CATEGORIES) {
    const raw = body?.[cat.id]
    if (!raw || typeof raw !== 'string' || !raw.trim()) {
      return Response.json({ error: `Please pick a car for every category.` }, { status: 400 })
    }
    if (!isEligibleCandidateName(raw)) {
      return Response.json({ error: `"${raw}" isn't a valid pick for ${cat.en.label}.` }, { status: 400 })
    }
    if (normalizeName(raw) === normalizeName(participant.name)) {
      return Response.json({ error: "You can't vote for yourself." }, { status: 400 })
    }
    picks[cat.id] = raw.trim()
  }

  const { error } = await supabase.from('wtet_awards_votes').upsert(
    {
      email:          normalEmail,
      voter_name:     participant.name,
      most_beautiful: picks.most_beautiful,
      best_driver:    picks.best_driver,
      best_energy:    picks.best_energy,
      updated_at:     new Date().toISOString(),
    },
    { onConflict: 'email' }
  )
  if (error) return Response.json({ error: 'Failed to save your vote.' }, { status: 500 })

  return Response.json({ success: true })
}
