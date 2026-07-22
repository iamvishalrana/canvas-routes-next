-- Corrects an accidental line break that split "Soft and hard drinks are
-- not covered by Canvas Routes" into two bullets instead of one.
UPDATE public.events
SET checkin_lunch_intro = E'Minestrone soup starter\nYour choice of main course below\nChef''s choice of dessert to finish\nSoft and hard drinks are not covered by Canvas Routes'
WHERE name = 'Hello to Montebello' AND type = 'Route';
