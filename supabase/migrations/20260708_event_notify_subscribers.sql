-- Standalone lightweight signup for people who want future-event notifications
-- without becoming a paying member. Deliberately kept separate from
-- `applications`/`contacts` (which are membership-intent tables) so this
-- low-friction list doesn't pollute membership admin views.

CREATE TABLE IF NOT EXISTS public.event_notify_subscribers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.event_notify_subscribers ENABLE ROW LEVEL SECURITY;
-- Admin routes use the service role key which bypasses RLS; this policy blocks direct client access.
CREATE POLICY IF NOT EXISTS "block_direct_client_access" ON public.event_notify_subscribers
  USING (false) WITH CHECK (false);
GRANT ALL ON TABLE public.event_notify_subscribers TO service_role;
