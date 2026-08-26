import { isSameEvent } from './eventCheckinShared.js'

// Road-trip capacity (upcoming_routes.max_cars) can't be counted off
// applications.stripe_payment_type/stripe_payment_status — those are single
// flat columns shared across every flow a person ever registers for (CLAUDE.md
// rule 22) and get overwritten the moment someone registers for a second
// event, undercounting this one. registrations[] is per-event and immune to
// that (see lib/markRegistrationPaid.js), so count matching entries there.
//
// Only counts CONFIRMED (paid: true) registrations, not authorized-but-
// uncaptured holds — matching the same philosophy already used for
// event_registrations capacity ("authorized... doesn't count as confirmed").
// Non-member road-trip holds are deliberately manual-capture (admin reviews
// each one), so a flood of pending holds shouldn't itself block new
// registrations; the admin can still see and manage an oversubscribed
// review queue by hand, same as today.
export async function isRouteAtCapacity(supabase, { eventName, maxCars }) {
  if (!maxCars) return false
  const { data } = await supabase.from('applications').select('registrations').not('registrations', 'is', null)
  let count = 0
  for (const app of (data || [])) {
    const reg = (app.registrations || []).find(r => isSameEvent(r.event, eventName))
    if (reg?.paid === true) count++
  }
  return count >= maxCars
}
