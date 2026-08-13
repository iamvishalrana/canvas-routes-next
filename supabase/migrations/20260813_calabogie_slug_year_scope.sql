-- Year-scope the Calabogie route slug so it matches the year-scoped Stripe
-- type road_trip_the-calabogie-boogie-2026 (see commit e407a8e). The Stripe
-- type must equal road_trip_<slug> — the webhook/capture matching, route
-- check-in link resolution (lib/routeEventLink.js getRouteCheckinUrl), and
-- route-scoped promo codes all key off it. Safe: Calabogie has no payments
-- yet and isn't launched, so nothing is orphaned.
--
-- A future edition (2027+) gets its own row with slug the-calabogie-boogie-2027,
-- keeping each year a distinct, non-colliding route.
update public.upcoming_routes
set slug = 'the-calabogie-boogie-2026'
where slug = 'the-calabogie-boogie';
