CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  entity_name TEXT,
  admin_email TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "block_direct_client_access" ON public.admin_activity_log
  USING (false) WITH CHECK (false);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.admin_activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON public.admin_activity_log (action);
