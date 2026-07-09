-- Extra questions captured on the express-interest form.
ALTER TABLE public.route_interest
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS car   TEXT;
