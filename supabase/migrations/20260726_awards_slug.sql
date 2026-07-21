-- Short, memorable public awards-voting URL (e.g. /awards/htm-2026) instead
-- of the raw events.id UUID. Nullable/optional — events without one keep
-- working at /awards/[id] exactly as before.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS awards_slug TEXT UNIQUE;

UPDATE public.events SET awards_slug = 'htm-2026'
WHERE name = 'Hello to Montebello' AND type = 'Route';
