-- More explicit and liability-safer than the previous "no other soft or
-- hard drinks are included" — spells out that other drinks (incl. alcohol)
-- can be bought from the venue directly, at the guest's own cost, and are
-- not provided or covered by Canvas Routes.
UPDATE public.events
SET checkin_lunch_intro = E'Minestrone soup starter\nYour choice of main course below\nChef''s choice of dessert to finish\nGourmet coffee and Lot 35 tea are included with lunch — any other beverages, including alcohol, can be purchased directly from the venue at your own cost and are not provided or covered by Canvas Routes'
WHERE name = 'Hello to Montebello' AND type = 'Route';
