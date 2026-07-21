-- "this should be the case for all the current routes and also the future
-- ones" — the 20260722 migration only linked Hello to Montebello's
-- upcoming_routes row to its events row. WTET and Into the Laurentians
-- already have their own events rows (created before upcoming_routes.event_id
-- existed) but were never linked. Backfill by matching each route's name
-- against the event's name with its "— Date" suffix stripped (same
-- normalization lib/eventCheckinShared.js's baseEventName() already does),
-- so this covers whichever routes currently have a matching events row
-- without hardcoding names/dates that might not match production exactly.
UPDATE public.upcoming_routes ur
SET event_id = ev.id
FROM public.events ev
WHERE ur.event_id IS NULL
  AND ev.type = 'Route'
  AND split_part(ev.name, ' — ', 1) = ur.name;
