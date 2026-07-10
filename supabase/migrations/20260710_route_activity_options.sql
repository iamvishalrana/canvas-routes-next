-- Per-route activity options for the express-interest form (admin-editable).
-- Empty array = the form falls back to the generic default list.
ALTER TABLE public.upcoming_routes
  ADD COLUMN IF NOT EXISTS activity_options JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Area-specific seeds for the 2026 routes
UPDATE public.upcoming_routes SET activity_options =
  '["Scenic drives", "Whale watching", "Local food & cheese", "Lookout stops", "Photography", "Relaxing"]'::jsonb
  WHERE slug = 'memoirs-to-charlevoix';

UPDATE public.upcoming_routes SET activity_options =
  '["Scenic drives", "Percé Rock boat tour", "Forillon National Park", "Seafood stops", "Lighthouse stops", "Photography"]'::jsonb
  WHERE slug = 'the-gaspesie-odyssey';

UPDATE public.upcoming_routes SET activity_options =
  '["Scenic drives", "The Grotto & Bruce Trail", "Flowerpot Island boat tour", "Chi-Cheemaun ferry", "Local food", "Photography"]'::jsonb
  WHERE slug = 'the-tobermory-story';

UPDATE public.upcoming_routes SET activity_options =
  '["Scenic drives", "Track laps at Calabogie", "Highlands backroads", "Lakeside lunch", "Photography"]'::jsonb
  WHERE slug = 'the-calabogie-boogie';

UPDATE public.upcoming_routes SET activity_options =
  '["Scenic drives", "Skyline Trail hike", "Whale watching", "Lobster & seafood", "Live Celtic music", "Photography"]'::jsonb
  WHERE slug = 'the-cabot-trail-grail';
