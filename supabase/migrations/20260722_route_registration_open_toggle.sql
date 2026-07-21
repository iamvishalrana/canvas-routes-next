-- Hello to Montebello's "registration open" gate used to live on an `events`
-- row that migration 20260716_routes_past_and_reorder.sql deleted when HTM
-- moved into upcoming_routes — leaving both hello-to-montebello-register and
-- hello-to-montebello-member-register checking a row that no longer exists,
-- so registration silently defaulted to always-open with no way to close it.
-- This column replaces that dead check.
ALTER TABLE public.upcoming_routes
  ADD COLUMN IF NOT EXISTS registration_open BOOLEAN NOT NULL DEFAULT true;
