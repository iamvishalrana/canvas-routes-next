import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureException } from '../../../../lib/sentry'
import { listEventCandidates } from '../../../../lib/eventCheckinShared'

const EVENT_NAME = 'Hello to Montebello — 2026'

// Public car roster for the itinerary page — auto-reflects who's actually
// paid and confirmed (no code/DB edit needed per registrant, and refunded/
// removed registrants fall out automatically since listEventCandidates
// already excludes them). Only paid (captured) registrations are included —
// a non-member's authorization hold isn't shown until admin actually
// captures it, so a car doesn't appear before the registration is confirmed.
export async function GET() {
  const admin = createAdminClient()

  const { data: route } = await admin.from('upcoming_routes').select('event_id').eq('slug', 'hello-to-montebello').maybeSingle()
  if (!route?.event_id) return Response.json({ participants: [] })

  try {
    const candidates = await listEventCandidates(admin, route.event_id, EVENT_NAME)
    const participants = candidates
      .filter(c => c.paymentStatus === 'paid')
      .map(c => ({ name: c.name, car: c.car, photo: c.photo, group: c.group }))
    return Response.json({ participants })
  } catch (err) {
    captureException(err, { context: 'htm-roster' })
    return Response.json({ participants: [] })
  }
}
