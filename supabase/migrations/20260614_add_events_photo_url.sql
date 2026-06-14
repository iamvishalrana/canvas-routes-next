-- Ensure photo_url column exists on events (may be absent if table pre-dates schema update)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Ensure service_role has full access to events (same fix pattern as broadcasts + event_registrations)
GRANT ALL ON TABLE public.events TO service_role;
