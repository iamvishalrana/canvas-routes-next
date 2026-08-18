-- Idempotency log for the automatic birthday email cron
-- (app/api/cron/birthday-email/route.js). The UNIQUE(email, year) constraint
-- is what actually prevents a double-send if the cron fires more than once
-- during Montreal's midnight hour (it's scheduled hourly and checks local
-- time itself, since Vercel Cron schedules are fixed-UTC and not DST-aware) —
-- the app-level "did we already send this" check is a read-then-write race
-- without it.
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
