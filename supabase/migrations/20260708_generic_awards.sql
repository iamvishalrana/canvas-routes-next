-- Generalized per-event Route Awards voting, modeled on WTET's Route Awards
-- but configurable per event and with auto-derived candidates instead of a
-- hand-typed participant list. WTET's own wtet_awards_votes table and
-- routes are left untouched — this is a parallel system for future events.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS awards_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS awards_categories JSONB DEFAULT '[]',        -- [{id, label, body, discount_pct}]
  ADD COLUMN IF NOT EXISTS awards_ineligible_names TEXT[] DEFAULT '{}'; -- e.g. exclude the organizer

CREATE TABLE IF NOT EXISTS public.event_awards_votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  voter_name  TEXT NOT NULL,
  picks       JSONB NOT NULL,       -- { "<category_id>": "<candidate name>" }
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);
ALTER TABLE public.event_awards_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "block_direct_client_access" ON public.event_awards_votes
  USING (false) WITH CHECK (false);
