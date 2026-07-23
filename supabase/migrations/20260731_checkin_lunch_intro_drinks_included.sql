-- Clarifies what the "drinks not covered" line actually means: gourmet
-- coffee and Lot 35 tea ARE included with lunch — no other soft or hard
-- drinks are.
UPDATE public.events
SET checkin_lunch_intro = E'Minestrone soup starter\nYour choice of main course below\nChef''s choice of dessert to finish\nGourmet coffee and Lot 35 tea are included with lunch — no other soft or hard drinks are included'
WHERE name = 'Hello to Montebello' AND type = 'Route';
