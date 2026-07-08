import { requireAdmin } from '../../../../lib/supabase/authCheck.js'
import { createAdminClient } from '../../../../lib/supabase/admin.js'
import { WTET_AWARD_CATEGORIES, isEligibleCandidateName } from '../../../../lib/wtetAwardsContent.js'
import { WTET_PARTICIPANTS, findWtetParticipant } from '../../../../lib/wtetParticipants.js'
import { normalizeEventName } from '../../../../lib/eventMeta.js'
import { isWtetEventName } from '../../../../lib/wtetRegistrationContent.js'
import { normalizeEmail } from '../../../../lib/normalizeEmail.js'

// Resolves the roster of applications that are actually eligible to vote (same
// rule as app/api/wtet-awards/lookup/route.js), each matched to a canonical
// participant record so "who hasn't voted" can show name/car/email. There's no
// dedicated eligibility table — WTET_PARTICIPANTS has no email field — so this
// has to be reconstructed by fuzzy name-matching applications, same as the
// public lookup flow. Keyed by participant name to dedupe if two applications
// resolve to the same participant.
async function getEligibleWtetVoters(supabase) {
  const { data: apps } = await supabase.from('applications')
    .select('name, email, stripe_payment_type, stripe_payment_status, registrations')
  const byParticipant = new Map()
  for (const app of apps || []) {
    const isStripeWtet = app.stripe_payment_type === 'road_trip_wtet' && ['paid', 'authorized'].includes(app.stripe_payment_status)
    const isManualWtet = (app.registrations || []).some(r => isWtetEventName(normalizeEventName(r.event)))
    if (!isStripeWtet && !isManualWtet) continue
    const participant = findWtetParticipant(app.name)
    if (!participant) continue
    const email = normalizeEmail(app.email)
    if (!email || byParticipant.has(participant.name)) continue
    byParticipant.set(participant.name, { name: participant.name, email, car: participant.car, photo: participant.photo || null })
  }
  return Array.from(byParticipant.values())
}

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createAdminClient()
  const [{ data: votes, error }, eligibleVoters] = await Promise.all([
    supabase.from('wtet_awards_votes').select('*').order('created_at', { ascending: true }),
    getEligibleWtetVoters(supabase),
  ])
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const votedEmails = new Set((votes || []).map(v => normalizeEmail(v.email)))
  const notVoted = eligibleVoters.filter(v => !votedEmails.has(v.email))

  const byName = new Map(WTET_PARTICIPANTS.map(p => [p.name, p]))

  const tallies = {}
  for (const cat of WTET_AWARD_CATEGORIES) {
    const counts = {}
    for (const v of votes || []) {
      const pick = v[cat.id]
      if (!pick || !isEligibleCandidateName(pick)) continue
      counts[pick] = (counts[pick] || 0) + 1
    }
    tallies[cat.id] = Object.entries(counts)
      .map(([name, count]) => ({ name, count, car: byName.get(name)?.car || null, photo: byName.get(name)?.photo || null }))
      .sort((a, b) => b.count - a.count)
  }

  return Response.json({
    categories:    WTET_AWARD_CATEGORIES.map(c => ({ id: c.id, label: c.en.label })),
    tallies,
    totalVotes:    votes?.length || 0,
    totalEligible: WTET_PARTICIPANTS.length,
    notVoted,
    voters: (votes || []).map(v => ({
      email: v.email,
      name: v.voter_name,
      votedAt: v.updated_at,
      picks: WTET_AWARD_CATEGORIES.map(cat => ({
        categoryId:    cat.id,
        categoryLabel: cat.en.label,
        name:          v[cat.id] || null,
        car:           byName.get(v[cat.id])?.car || null,
      })),
    })),
  })
}
