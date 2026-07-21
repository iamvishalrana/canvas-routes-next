-- Registration link per route — once a route launches, this points everyone
-- (public + members portal tile) to the actual public registration page for
-- that specific route, instead of a plain "check your email" dead end.
ALTER TABLE public.upcoming_routes
  ADD COLUMN IF NOT EXISTS registration_url TEXT;

-- Hello to Montebello already has a dedicated registration page — set it now
-- so the launched tile is immediately clickable without an admin edit.
UPDATE public.upcoming_routes
SET registration_url = '/hello-to-montebello',
    photo_url = COALESCE(photo_url, '/montebello-hero.jpg')
WHERE slug = 'hello-to-montebello';
