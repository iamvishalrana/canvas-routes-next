-- Security hardening — from the admin-panel security audit (2026-09-04).
-- Pure hardening: no application code depends on this migration. Every
-- affected function is only ever called server-side via the service_role
-- client, which keeps its own EXECUTE grant, so the app is unaffected.

-- ── 1. HIGH — revoke public EXECUTE on two SECURITY DEFINER RPCs ────────────
-- Both currently have EXECUTE granted to PUBLIC (verified: ACL "=X/postgres"),
-- so anyone holding the public anon key (it ships in the browser) can call
-- them directly via /rest/v1/rpc/. Because they run SECURITY DEFINER (bypassing
-- RLS), register_for_event lets an attacker POST p_stripe_payment_status='paid'
-- with any email and create a confirmed "paid" event registration WITHOUT
-- paying (and burn event capacity); claim_partner_code lets anyone grab partner
-- discount codes for arbitrary member ids.
-- Legit callers use admin.rpc(...) (service_role): app/api/member/events/[id]/
-- register, .../free-register, app/api/member/partner-code/[slug]. service_role
-- retains its grant, so this is a no-op for the app.
REVOKE EXECUTE ON FUNCTION public.register_for_event(uuid, uuid, text, text, text, text, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_partner_code(text, uuid) FROM PUBLIC, anon, authenticated;

-- ── 2. Pin search_path on both SECURITY DEFINER functions ───────────────────
-- A mutable search_path on a SECURITY DEFINER function is a privilege-
-- escalation vector: a caller can prepend a schema they control and shadow an
-- unqualified object the function references, running their code as the
-- definer. Pinning it closes that. pg_temp goes last, per Postgres guidance.
ALTER FUNCTION public.register_for_event(uuid, uuid, text, text, text, text, integer, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.claim_partner_code(text, uuid) SET search_path = public, pg_temp;

-- ── 3. Drop a leftover backup table ─────────────────────────────────────────
-- photo_share_items_old_backup was left in the API-exposed public schema during
-- the 2026-08-19 photo-share restructure. Not referenced anywhere in code —
-- needless attack surface + stale copy of data. (RLS-enabled/no-policy means
-- clients can't read it today, but there's no reason to keep it around.)
DROP TABLE IF EXISTS public.photo_share_items_old_backup;
