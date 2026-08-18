-- Idempotency log for the automatic birthday email cron
-- (app/api/cron/birthday-email/route.js). The UNIQUE(email, year) constraint
-- is what actually prevents a double-send — the app-level "did we already
-- send this" check is a read-then-write race without it (e.g. the scheduled
-- run and a manual admin-panel retest landing close together).
CREATE TABLE IF NOT EXISTS public.birthday_emails_log (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email   TEXT NOT NULL,
  year    SMALLINT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email, year)
);

ALTER TABLE public.birthday_emails_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "block_direct_client_access" ON public.birthday_emails_log
  USING (false) WITH CHECK (false);
