-- SECURITY FIX: rsvp_tokens had RLS disabled entirely, plus an explicit
-- `GRANT SELECT ... TO authenticated` from 20260614_add_rsvp_tokens_grants.sql.
-- With RLS off, that grant meant ANY logged-in member (not just admins) could
-- read every row directly via the Supabase REST API — including other
-- people's RSVP tokens (which double as bearer secrets for /rsvp/[token],
-- letting anyone holding one confirm/decline someone else's RSVP) and their
-- private answers (dietary, guest details, etc.). All legitimate reads/writes
-- already go through /api/rsvp/* using the service-role client, which
-- bypasses RLS entirely — so this can be locked down with no functional impact.
ALTER TABLE public.rsvp_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "block_direct_client_access" ON public.rsvp_tokens
  USING (false) WITH CHECK (false);
REVOKE SELECT ON TABLE public.rsvp_tokens FROM authenticated;

-- settings currently has no RLS and (as far as the shipped migrations show)
-- no grant to anon/authenticated either, so it's been protected only by the
-- absence of an explicit grant — not by design. Locking it down properly so
-- a future migration can't accidentally expose it (it holds the live
-- Instagram access token among other things). All reads/writes already go
-- through /api/admin/settings and /api/public/settings via the service-role
-- client.
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "block_direct_client_access" ON public.settings
  USING (false) WITH CHECK (false);
