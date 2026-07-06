import { requireAdmin } from '../../../../lib/supabase/authCheck.js'
import { createAdminClient } from '../../../../lib/supabase/admin.js'
import { WTET_AWARD_CATEGORIES, isEligibleCandidateName } from '../../../../lib/wtetAwardsContent.js'
import { WTET_PARTICIPANTS } from '../../../../lib/wtetParticipants.js'

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createAdminClient()
  const { data: votes, error } = await supabase.from('wtet_awards_votes').select('*').order('created_at', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })

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
