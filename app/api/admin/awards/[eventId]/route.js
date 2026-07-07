import { requireAdmin } from '../../../../../lib/supabase/authCheck.js'
import { createAdminClient } from '../../../../../lib/supabase/admin.js'
import { listEventCandidates } from '../../../../../lib/eventCheckinShared.js'

function norm(s) { return (s || '').toLowerCase().trim() }

export async function GET(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { eventId } = await params

  const admin = createAdminClient()
  const { data: event, error: eventErr } = await admin.from('events')
    .select('id, name, awards_enabled, awards_categories, awards_ineligible_names')
    .eq('id', eventId).maybeSingle()
  if (eventErr || !event) return Response.json({ error: 'Event not found' }, { status: 404 })

  const [{ data: votes, error }, candidates] = await Promise.all([
    admin.from('event_awards_votes').select('*').eq('event_id', eventId).order('created_at', { ascending: true }),
    listEventCandidates(admin, eventId, event.name),
  ])
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const byName = new Map(candidates.map(c => [norm(c.name), c]))
  const categories = event.awards_categories || []
  const validNames = new Set(candidates.map(c => norm(c.name)))

  const tallies = {}
  for (const cat of categories) {
    const counts = {}
    for (const v of votes || []) {
      const pick = v.picks?.[cat.id]
      if (!pick || !validNames.has(norm(pick))) continue
      counts[pick] = (counts[pick] || 0) + 1
    }
    tallies[cat.id] = Object.entries(counts)
      .map(([name, count]) => ({ name, count, car: byName.get(norm(name))?.car || null, photo: byName.get(norm(name))?.photo || null }))
      .sort((a, b) => b.count - a.count)
  }

  return Response.json({
    event,
    categories,
    tallies,
    totalVotes: votes?.length || 0,
    totalEligible: candidates.length,
    voters: (votes || []).map(v => ({
      email: v.email,
      name: v.voter_name,
      votedAt: v.updated_at,
      picks: categories.map(cat => ({
        categoryId: cat.id,
        categoryLabel: cat.label,
        name: v.picks?.[cat.id] || null,
        car: byName.get(norm(v.picks?.[cat.id]))?.car || null,
      })),
    })),
  })
}
