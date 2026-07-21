-- Tracks whether the "you're all checked in" email (waiver copy + itinerary
-- note) has already been sent for this registrant/event, so completing the
-- last of trip-details/waiver/lunch — whichever order they're filled in —
-- triggers exactly one email, not one per section save.
ALTER TABLE public.event_checkins
  ADD COLUMN IF NOT EXISTS completion_email_sent_at TIMESTAMPTZ;
