-- Backfill an events row for Hello to Montebello so it's manageable from
-- the admin panel (Events tab) the same way as every other event. type =
-- 'Route' is the same convention WTET and Into the Laurentians use, which
-- already excludes it from the homepage events grid, the members portal's
-- Meets & Events list, and the members dashboard's upcoming-events widget
-- (all three filter on ev.type !== 'Route') — so no extra "hidden" flag is
-- needed. registration_enabled / public_registration_enabled are set to
-- true explicitly to match the page's current live, open state; leaving
-- them off would default to false and silently close registration.
INSERT INTO public.events (
  name, date, date_display, location, description, type, trip_length,
  registration_url, member_price, registration_enabled, public_registration_enabled
)
SELECT
  'Hello to Montebello', '2026-07-26', '26 July 2026', 'Montebello, QC',
  'A curated convoy from Montreal to Fairmont Le Château Montebello — coffee at L''Atelier des Deux P in Amherst, lunch at Aux Chantignoles inside the largest log château in the world, and a stop at Chocomotive before the drive home.',
  'Route', 'Same Day',
  'https://canvasroutes.com/hello-to-montebello', 17900, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.events WHERE name = 'Hello to Montebello' AND date = '2026-07-26'
);
