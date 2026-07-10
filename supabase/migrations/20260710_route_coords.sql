-- Destination coordinates so the /routes Map view can plot each trip from
-- Montreal, styled like the itinerary-page maps.
ALTER TABLE public.upcoming_routes
  ADD COLUMN IF NOT EXISTS dest_lat NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS dest_lng NUMERIC(9,6);

UPDATE public.upcoming_routes SET dest_lat = 47.441200, dest_lng = -70.505200 WHERE slug = 'memoirs-to-charlevoix';  -- Baie-Saint-Paul
UPDATE public.upcoming_routes SET dest_lat = 48.524000, dest_lng = -64.217000 WHERE slug = 'the-gaspesie-odyssey';   -- Percé
UPDATE public.upcoming_routes SET dest_lat = 45.253400, dest_lng = -81.664500 WHERE slug = 'the-tobermory-story';    -- Tobermory
UPDATE public.upcoming_routes SET dest_lat = 45.301600, dest_lng = -76.718000 WHERE slug = 'the-calabogie-boogie';   -- Calabogie
UPDATE public.upcoming_routes SET dest_lat = 46.688500, dest_lng = -60.396800 WHERE slug = 'the-cabot-trail-grail';  -- Ingonish, Cabot Trail
