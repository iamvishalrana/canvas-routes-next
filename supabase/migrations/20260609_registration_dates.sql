-- Replace manual registration_enabled toggle with date-based open/close
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_opens_at TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_closes_at TIMESTAMPTZ;
