-- Kill the recurring "permission denied for table X" class of bug for good.
-- Tables created via the SQL Editor don't automatically grant privileges to
-- service_role, so every new table has been silently failing for admin API
-- writes until a one-off grant migration was run (broadcasts, rsvp_tokens,
-- event_registrations, and now unsubscribed_emails). This grants on every
-- existing table AND sets default privileges so future tables are covered.
-- Safe to run multiple times.

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Future tables/sequences/functions created by postgres (the SQL Editor role)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

-- Verify: both of these should return rows without a permission error.
-- SELECT count(*) FROM public.unsubscribed_emails;
-- SELECT subject, sent_at FROM public.broadcasts ORDER BY sent_at DESC LIMIT 3;
