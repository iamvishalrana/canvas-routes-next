-- Bring past routes (previously hardcoded in lib/pastRoutes.js, read-only
-- in admin) into upcoming_routes so they get the same edit/reorder controls
-- as active routes instead of requiring a code change every time.
ALTER TABLE public.upcoming_routes
  ADD COLUMN IF NOT EXISTS is_past BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cars_rolled_out INT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS recap_href TEXT;

INSERT INTO public.upcoming_routes (
  slug, name, destination, month_label, description, target_count, sort_order,
  is_active, is_past, launched, cars_rolled_out, photo_url, recap_href
) VALUES
  ('whips-to-eastern-townships', 'Whips to Eastern Townships', 'Eastern Townships, QC', 'July 2026',
   'Serene backroads through wine country, mountain passes, and a fine dining experience to close the day.',
   18, 10, true, true, true, 22, '/wtet.png', '/wtet'),
  ('into-the-laurentians', 'Into the Laurentians', 'Mont-Tremblant, QC', 'June 2026',
   'The road starts at 7 AM in LaSalle. By the time you reach the Laurentians, the city feels far away.',
   9, 11, true, true, true, 11, '/trem-trip.jpg', '/routes/into-the-laurentians')
ON CONFLICT (slug) DO NOTHING;

-- Move Hello to Montebello out of events (Meets & Events admin) into
-- upcoming_routes (Routes admin) instead — it's a route, not a meet, and
-- Routes has the edit/reorder controls this table is being upgraded with.
DELETE FROM public.events WHERE name = 'Hello to Montebello' AND date = '2026-07-26';

INSERT INTO public.upcoming_routes (
  slug, name, destination, month_label, description, target_count, sort_order,
  is_active, is_past, launched
)
SELECT 'hello-to-montebello', 'Hello to Montebello', 'Montebello, QC', 'July 2026',
  'A curated convoy from Montreal to Fairmont Le Château Montebello — coffee at L''Atelier des Deux P in Amherst, lunch at Aux Chantignoles inside the largest log château in the world, and a stop at Chocomotive before the drive home.',
  1, 6, false, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.upcoming_routes WHERE slug = 'hello-to-montebello');
