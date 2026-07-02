-- Repair broadcast history end-to-end. Safe to run multiple times.
-- Root cause of "history not saved": the broadcasts table was created with RLS
-- enabled but no table grants, so service_role inserts fail with permission
-- denied — and the API route used to swallow that error silently. Later
-- ALTER TABLE migrations (body_html, failed_recipients) may also be unapplied,
-- which makes the whole insert fail on an unknown column.

CREATE TABLE IF NOT EXISTS public.broadcasts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject      TEXT NOT NULL,
  audience     TEXT NOT NULL,
  specific_emails JSONB,
  sent_count   INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  sent_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS body_html TEXT;
ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS failed_recipients JSONB;

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.broadcasts TO service_role;

-- Verify: this should return the two newest history rows after the next send.
-- SELECT subject, sent_count, failed_count, sent_at FROM public.broadcasts ORDER BY sent_at DESC LIMIT 2;
