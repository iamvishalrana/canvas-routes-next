-- Car photo ask, added to the generic check-in flow: registrants can submit
-- a photo of their car for us to use on the (private) itinerary page. Stored
-- per-event on event_checkins, same shape as the other sections ({url,
-- submitted_at}). 'car_photo' becomes a fourth valid value in the existing
-- events.checkin_sections array — no new column needed there.
ALTER TABLE public.event_checkins
  ADD COLUMN IF NOT EXISTS car_photo JSONB;
