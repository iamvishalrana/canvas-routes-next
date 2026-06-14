-- Columns used in production but absent from schema.sql / migrations
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS membership_number TEXT;

-- Blanket service_role grants for core tables (same pattern as broadcasts/event_registrations/rsvp_tokens)
GRANT ALL ON TABLE public.members TO service_role;
GRANT ALL ON TABLE public.applications TO service_role;
GRANT ALL ON TABLE public.contacts TO service_role;
GRANT ALL ON TABLE public.announcements TO service_role;
