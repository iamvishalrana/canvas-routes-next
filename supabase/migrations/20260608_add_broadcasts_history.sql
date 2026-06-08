CREATE TABLE IF NOT EXISTS public.broadcasts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject      TEXT NOT NULL,
  audience     TEXT NOT NULL,
  specific_emails JSONB,
  sent_count   INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  sent_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "block_direct_client_access" ON public.broadcasts
  USING (false) WITH CHECK (false);
