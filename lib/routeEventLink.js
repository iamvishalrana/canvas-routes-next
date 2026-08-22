import { captureException } from './sentry'

// Ensures a route has a linked `events` row (type: 'Route'), which is what
// gives it the Registrants / Check-in / Route Awards tabs in Admin > Routes
// (see RouteEventConfigClient, gated on upcoming_routes.event_id being set).
// Safe to call on a route that's already linked — it's a no-op then.
//
// Two callers rely on this: route creation (so brand-new routes are always
// linked) and route launch (a safety net — routes created before this
// existed, or created through any path that skipped it, still get linked
// the moment they launch, which is when check-in/awards start to matter).
export async function ensureRouteEventLinked(supabase, route) {
  if (route.event_id) return route

  const { data: ev, error: evErr } = await supabase.from('events').insert({
    name: route.name,
    date: route.month_label,
    date_display: route.month_label,
    location: route.destination,
    description: route.description || '',
    type: 'Route',
    registration_url: route.registration_url || 'https://canvasroutes.com/routes',
  }).select('id').single()

  if (evErr) {
    captureException(evErr, { context: 'route-event-link-create', routeId: route.id })
    return route
  }

  const { data: linked, error: linkErr } = await supabase.from('upcoming_routes')
    .update({ event_id: ev.id }).eq('id', route.id).select('*').single()
  if (linkErr) {
    captureException(linkErr, { context: 'route-event-link-attach', routeId: route.id, eventId: ev.id })
    return route
  }
  return linked
}
