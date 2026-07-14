-- The season's first two Cars & Coffee meets predate the admin events
-- system and were hardcoded directly in app/page.jsx with no DB row and no
-- description. Backfilling as real rows so they're editable in the admin
-- panel and show up in the members portal's past Meets & Events, like every
-- other event. Guarded with NOT EXISTS so this is safe to run more than once.
INSERT INTO public.events (name, date, date_display, location, description, type)
SELECT 'Cars & Coffee', '2026-05-09', '9 May 2026', 'Montreal, QC',
  'The season''s opening Cars & Coffee — good cars, great coffee, and better people, right in the heart of Montreal.',
  'Cars & Coffee'
WHERE NOT EXISTS (
  SELECT 1 FROM public.events WHERE name = 'Cars & Coffee' AND date = '2026-05-09'
);

INSERT INTO public.events (name, date, date_display, location, description, type)
SELECT 'Grand Prix Weekend - Cars, Coffee & Cruise', '2026-05-23', '23 May 2026', 'Exotics and Classics, Montreal',
  'A Grand Prix weekend cruise alongside Exotics and Classics — cars, coffee, and a drive through the city to celebrate race weekend.',
  'Cars & Coffee'
WHERE NOT EXISTS (
  SELECT 1 FROM public.events WHERE name = 'Grand Prix Weekend - Cars, Coffee & Cruise' AND date = '2026-05-23'
);
