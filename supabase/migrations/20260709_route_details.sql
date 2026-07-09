-- Route detail fields: per-car price, capacity (max cars), and an itinerary.
ALTER TABLE public.upcoming_routes
  ADD COLUMN IF NOT EXISTS price_per_car NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS max_cars      INT,
  ADD COLUMN IF NOT EXISTS itinerary     TEXT NOT NULL DEFAULT '';
