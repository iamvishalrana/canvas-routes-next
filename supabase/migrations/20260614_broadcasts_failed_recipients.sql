-- Store per-recipient failure details on each broadcast
ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS failed_recipients JSONB;
