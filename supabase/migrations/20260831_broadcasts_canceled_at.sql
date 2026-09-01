-- Supports schedulable broadcasts: a broadcast's lifecycle phase (sent /
-- scheduled / canceled) is derived from this column plus the existing
-- sent_at, rather than tracked in a separate status enum — see
-- lib/broadcastPhase.js for the shared derivation logic used by both the
-- API routes and the merged Email Activity feed.
ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;
