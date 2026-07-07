import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit } from '../../../../../lib/rateLimit'
import { normalizeEmail } from '../../../../../lib/normalizeEmail'
import { findEventRegistrant, listEventCandidates } from '../../../../../lib/eventCheckinShared'

function norm(s) { return (s || '').toLowerCase().trim() }

export async function POST(request, { params }) {
  const { eventId } = await params
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim() || 'unknown'
  if (await checkRateLimit(ip, 15, 60)) return Response.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const email = normalizeEmail(body?.email)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: event, error: eventErr } = await admin.from('events')
    .select('id, name, awards_enabled, awards_categories, awards_ineligible_names')
    .eq('id', eventId).maybeSingle()
  if (eventErr || !event || !event.awards_enabled) {
    return Response.json({ error: 'Voting is not available for this event.' }, { status: 404 })
  }

  const registrant = await findEventRegistrant(admin, eventId, event.name, email)
  if (!registrant) {
    return Response.json({ error: `We couldn't find a registration for ${event.name} matching that email.` }, { status: 404 })
  }

  const ineligible = new Set((event.awards_ineligible_names || []).map(norm))
  const allCandidates = await listEventCandidates(admin, eventId, event.name)
  const candidates = allCandidates
    .filter(c => norm(c.name) !== norm(registrant.name) && !ineligible.has(norm(c.name)))
    .map(c => ({ name: c.name, car: c.car, photo: c.photo }))

  const { data: voteRow } = await admin.from('event_awards_votes')
    .select('picks').eq('event_id', eventId).eq('email', email).maybeSingle()

  return Response.json({
    voterName: registrant.name,
    candidates,
    categories: event.awards_categories || [],
    existingVote: voteRow?.picks || null,
  })
}
