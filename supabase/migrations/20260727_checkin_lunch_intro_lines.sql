-- Reformat HTM's lunch intro from one dense paragraph into short
-- newline-separated lines, so the check-in page can render it as a clean
-- list instead of a wall of text.
UPDATE public.events
SET checkin_lunch_intro = E'Minestrone soup starter\nYour choice of main course below\nChef''s choice of dessert to finish\nSoft and hard drinks are not covered by Canvas Routes'
WHERE name = 'Hello to Montebello' AND type = 'Route';
