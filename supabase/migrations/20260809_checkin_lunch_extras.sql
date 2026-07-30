-- Lets an admin add lunch orders for people who aren't event registrants at
-- all (team/staff helping run the event) so they show up alongside real
-- registrants in the Lunch Selections list and every export. Safe to run
-- multiple times.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS checkin_lunch_extras JSONB DEFAULT '[]'::jsonb;
