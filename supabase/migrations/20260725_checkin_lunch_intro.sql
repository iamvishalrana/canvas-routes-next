-- Admin-editable intro paragraph shown above the dish choices on the
-- check-in Lunch section (e.g. explaining a fixed starter/dessert that
-- isn't itself a selectable option) — generic across every route, not
-- hardcoded per event.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS checkin_lunch_intro TEXT;

UPDATE public.events
SET checkin_lunch_intro = 'Lunch is a three-course meal: a minestrone soup starter, your choice of main course below, and the chef''s choice of dessert to finish. Soft and hard drinks are not covered by Canvas Routes.'
WHERE name = 'Hello to Montebello' AND type = 'Route';
