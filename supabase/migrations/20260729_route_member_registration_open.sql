-- registration_open (added in 20260722_route_registration_open_toggle.sql)
-- gates BOTH the public and member registration flows together — there was
-- no way to close registration to the public while keeping it open to
-- members (or vice versa), a real scenario once a route is close to full and
-- the club wants to prioritize members for the remaining spots. This column
-- gates hello-to-montebello-member-register independently;
-- hello-to-montebello-register keeps reading registration_open, which now
-- effectively means "public registration open."
ALTER TABLE public.upcoming_routes
  ADD COLUMN IF NOT EXISTS member_registration_open BOOLEAN NOT NULL DEFAULT true;
