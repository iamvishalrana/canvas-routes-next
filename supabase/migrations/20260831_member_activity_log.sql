-- Member self-service activity log (login, profile edits, check-ins, RSVPs,
-- route interest) — the member-initiated counterpart to admin_activity_log.
-- Mirrors admin_activity_log's shape/RLS convention exactly, just
-- member_email instead of admin_email. Written via lib/memberActivityLog.js,
-- which always uses the service-role client — this table blocks all direct
-- client access.
CREATE TABLE IF NOT EXISTS public.member_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  action TEXT NOT NULL,
  member_email TEXT,
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);
ALTER TABLE public.member_activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_direct_client_access" ON public.member_activity_log;
CREATE POLICY "block_direct_client_access" ON public.member_activity_log
  USING (false) WITH CHECK (false);
CREATE INDEX IF NOT EXISTS idx_member_activity_log_created_at ON public.member_activity_log (created_at DESC);
