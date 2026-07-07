-- Generalized per-event check-in (trip details / waiver / lunch), modeled on
-- the WTET flow but configurable per event instead of hardcoded to one route.
-- WTET's own wtet_checkin/wtet_waiver/wtet_lunch columns and API routes are
-- left untouched — this is a parallel system for future events.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS checkin_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS checkin_sections TEXT[] DEFAULT '{}',        -- subset of 'trip_details' | 'waiver' | 'lunch'
  ADD COLUMN IF NOT EXISTS checkin_max_passengers INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS checkin_lunch_options JSONB DEFAULT '[]',    -- [{id, name}]
  ADD COLUMN IF NOT EXISTS checkin_waiver_text TEXT,
  ADD COLUMN IF NOT EXISTS checkin_lunch_cutoff TIMESTAMPTZ;

-- Registrants come from two different places (event_registrations for
-- member-portal-paid signups, applications.registrations[] for public-form/
-- admin-manual/Stripe ones — see the merge logic in EventsClient.jsx's
-- toggleRegistrants). Check-in data needs one home regardless of which path
-- a registrant came through, so it's its own table keyed by (event, email)
-- rather than nested in applications like WTET's columns are.
CREATE TABLE IF NOT EXISTS public.event_checkins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  name          TEXT,
  trip_details  JSONB,
  waiver        JSONB,
  lunch         JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "block_direct_client_access" ON public.event_checkins
  USING (false) WITH CHECK (false);
