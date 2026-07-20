import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimit'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'
import { findEventRegistrant, listEventCandidates } from '../../../../../lib/eventCheckinShared'

function norm(s) { return (s || '').toLowerCase().trim() }

// POST { email, picks: { [categoryId]: candidateName } } — one ballot per
// registrant email per event, upserted on resubmit.
export async function POST(request, { params }) {
  const { eventId } = await params
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const email = normalizeEmail(body?.email)
  const picks = body?.picks
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (!picks || typeof picks !== 'object' || Array.isArray(picks)) {
    return Response.json({ error: 'Please pick a car for every category.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: event } = await admin.from('events')
    .select('id, name, awards_enabled, awards_categories, awards_ineligible_names')
    .eq('id', eventId).maybeSingle()
  if (!event || !event.awards_enabled) return Response.json({ error: 'Voting is closed.' }, { status: 400 })

  const registrant = await findEventRegistrant(admin, eventId, event.name, email)
  if (!registrant) return Response.json({ error: 'Not found' }, { status: 404 })

  const categories = event.awards_categories || []
  if (categories.length === 0) return Response.json({ error: 'Voting is not configured for this event.' }, { status: 400 })

  const ineligible = new Set((event.awards_ineligible_names || []).map(norm))
  const allCandidates = await listEventCandidates(admin, eventId, event.name)
  const validNames = new Set(
    allCandidates
      .filter(c => norm(c.name) !== norm(registrant.name) && !ineligible.has(norm(c.name)))
      .map(c => norm(c.name))
  )

  const cleanPicks = {}
  for (const cat of categories) {
    const raw = picks[cat.id]
    if (!raw || typeof raw !== 'string' || !raw.trim()) {
      return Response.json({ error: `Please pick a car for every category.` }, { status: 400 })
    }
    if (!validNames.has(norm(raw))) {
      return Response.json({ error: `"${raw}" isn't a valid pick for ${cat.label}.` }, { status: 400 })
    }
    cleanPicks[cat.id] = raw.trim()
  }

  const { error } = await admin.from('event_awards_votes').upsert(
    {
      event_id: eventId,
      email,
      voter_name: registrant.name,
      picks: cleanPicks,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'event_id,email' }
  )
  if (error) return Response.json({ error: 'Failed to save your vote.' }, { status: 500 })

  return Response.json({ success: true })
}
