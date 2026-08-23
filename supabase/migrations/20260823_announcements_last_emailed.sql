-- Persist "last emailed" state on announcements so the admin UI survives a
-- refresh instead of losing the "Sent to N" badge (it was client-only state).
-- Also lets the UI warn before an accidental re-send. Run in the Supabase SQL Editor.
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS last_emailed_at TIMESTAMPTZ;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS last_emailed_count INTEGER;
