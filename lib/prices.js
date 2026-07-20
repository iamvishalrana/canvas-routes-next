// Single source of truth for all Canvas Routes payment amounts (CAD cents)
export const PRICES = {
  road_trip_standard:      20000, // $200 CAD — non-member
  road_trip_member:        16000, // $160 CAD — Routes Member
  road_trip_inner_circle:  14000, // $140 CAD — Inner Circle
  road_trip_wtet:          19900, // $199 CAD — WTET non-member (original_amount in PI metadata takes precedence)
  'road_trip_hello-to-montebello': 22500, // $225 CAD — Hello to Montebello non-member (original_amount in PI metadata takes precedence)
  membership_routes:        9900, // $99 CAD
  membership_inner_circle: 24900, // $249 CAD
}

// Membership tier label <-> PaymentIntent/applications type. Shared by
// membership-waitlist (writes the tier label into applications.registrations)
// and the webhook's requires_capture rescue path (must write the identical
// registrations entry when the client tab closes before membership-waitlist
// fires — otherwise the applicant never gets a registrations[] entry and the
// admin panel can't show their tier, since tier is read only from
// registrations[].tier, never from stripe_payment_type).
export const MEMBERSHIP_TIER_TYPE = { 'Routes Member': 'membership_routes', 'Inner Circle': 'membership_inner_circle' }
export const MEMBERSHIP_TYPE_TIER = Object.fromEntries(Object.entries(MEMBERSHIP_TIER_TYPE).map(([tier, type]) => [type, tier]))
