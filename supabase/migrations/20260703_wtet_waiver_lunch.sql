-- WTET liability waiver + lunch preference. Safe to run multiple times.
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS wtet_waiver jsonb;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS wtet_lunch  jsonb;
