-- Estimated per-car price range shown on a route before its exact fee is set
-- at launch (price_per_car). Free text so admins can format it however they
-- like — e.g. "$800–$1,200" — and clear it anytime by leaving it blank.
ALTER TABLE public.upcoming_routes
  ADD COLUMN IF NOT EXISTS price_range TEXT;
