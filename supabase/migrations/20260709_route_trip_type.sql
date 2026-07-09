-- Mark a route's overall shape: single day, overnight (one night), or multi-day.
ALTER TABLE public.upcoming_routes
  ADD COLUMN IF NOT EXISTS trip_type TEXT NOT NULL DEFAULT 'day'
    CHECK (trip_type IN ('day', 'overnight', 'multi_day'));

-- Classify the seeded 2026 routes by their duration.
UPDATE public.upcoming_routes SET trip_type = 'multi_day'
  WHERE slug IN ('the-gaspesie-odyssey', 'the-cabot-trail-grail');
UPDATE public.upcoming_routes SET trip_type = 'overnight'
  WHERE slug = 'the-tobermory-story';
