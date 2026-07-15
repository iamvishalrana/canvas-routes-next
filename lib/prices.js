// Single source of truth for all Canvas Routes payment amounts (CAD cents)
export const PRICES = {
  road_trip_standard:      20000, // $200 CAD — non-member
  road_trip_member:        16000, // $160 CAD — Routes Member
  road_trip_inner_circle:  14000, // $140 CAD — Inner Circle
  road_trip_wtet:          19900, // $199 CAD — WTET non-member (original_amount in PI metadata takes precedence)
  'road_trip_hello-to-montebello': 19900, // $199 CAD — Hello to Montebello non-member (original_amount in PI metadata takes precedence)
  membership_routes:        9900, // $99 CAD
  membership_inner_circle: 24900, // $249 CAD
}
