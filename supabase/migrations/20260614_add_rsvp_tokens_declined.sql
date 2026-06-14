-- Track declined event applications in the RSVP tokens table
ALTER TABLE public.rsvp_tokens ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;
