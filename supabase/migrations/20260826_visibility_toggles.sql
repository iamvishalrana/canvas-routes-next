-- Independent listing-visibility toggles for events and routes, separate
-- from the existing registration toggles (registration_enabled/
-- public_registration_enabled on events; registration_open/
-- member_registration_open on upcoming_routes). Defaults to true so every
-- existing row keeps its current fully-visible behavior.
ALTER TABLE public.events
  ADD COLUMN visible_to_members boolean NOT NULL DEFAULT true,
  ADD COLUMN visible_to_public  boolean NOT NULL DEFAULT true;

ALTER TABLE public.upcoming_routes
  ADD COLUMN visible_to_members boolean NOT NULL DEFAULT true,
  ADD COLUMN visible_to_public  boolean NOT NULL DEFAULT true;
