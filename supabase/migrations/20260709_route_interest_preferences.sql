-- Trip-preference survey answers captured on the express-interest form
-- (budget, preferred dates, hotel preference, activities, and any future
-- questions). Flexible JSONB so new questions need no schema change.
ALTER TABLE public.route_interest
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
