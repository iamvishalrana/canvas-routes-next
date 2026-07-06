ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS trip_length TEXT
    CHECK (trip_length IS NULL OR trip_length IN ('Same Day', 'Overnight', 'Multiple Nights'));
