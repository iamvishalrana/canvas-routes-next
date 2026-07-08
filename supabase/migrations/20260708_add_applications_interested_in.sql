-- Captures what a non-member notify-signup (app/notify) said they're interested
-- in: Cars & Coffee meets, Routes, or both. Stored on applications since the
-- /api/notify-signup route upserts into that table like every other flow.
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS interested_in TEXT
  CHECK (interested_in IN ('cars_coffee', 'routes', 'both'));
