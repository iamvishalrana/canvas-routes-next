-- Pinned announcements: pinned ones sort first in the admin list and the
-- members-portal dashboard. Run in the Supabase SQL Editor.
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
