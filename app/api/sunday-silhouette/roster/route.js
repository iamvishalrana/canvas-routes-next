import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureException } from '../../../../lib/sentry'
import { listEventCandidates } from '../../../../lib/eventCheckinShared'

const EVENT_NAME = 'Sunday Silhouette — 2026'

// Public car roster for the itinerary page — auto-reflects who's actually
// paid and confirmed (no code/DB edit needed per registrant). Mirrors
// app/api/hello-to-montebello/roster/route.js. Returns an empty list until
// Jerry links upcoming_routes.event_id for slug 'sunday-silhouette-2026' to a
// generic check-in event.
export async function GET() {
  const admin = createAdminClient()

  const { data: route } = await admin.from('upcoming_routes').select('event_id').eq('slug', 'sunday-silhouette-2026').maybeSingle()
  if (!route?.event_id) return Response.json({ participants: [] })

  try {
    const candidates = await listEventCandidates(admin, route.event_id, EVENT_NAME)
    const participants = candidates
      .filter(c => c.paymentStatus === 'paid')
      .map(c => ({ name: c.name, car: c.car, photo: c.photo, group: c.group, lead: c.lead }))
    return Response.json({ participants })
  } catch (err) {
    captureException(err, { context: 'ss-roster' })
    return Response.json({ participants: [] })
  }
}
