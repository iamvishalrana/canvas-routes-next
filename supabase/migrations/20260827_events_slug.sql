-- Event short links (e.g. canvasroutes.com/ccsept5-2026), resolved dynamically
-- by middleware.js instead of a hardcoded next.config.mjs rewrite entry per
-- event. Format-checked at the DB level too as defense in depth alongside the
-- app-layer normalizeSlug()/isReservedSlug() checks in lib/reservedSlugs.js.
ALTER TABLE public.events ADD COLUMN slug text;
ALTER TABLE public.events ADD CONSTRAINT events_slug_format_check CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
CREATE UNIQUE INDEX events_slug_unique_idx ON public.events (slug) WHERE slug IS NOT NULL;

-- Migrate the one short link that previously lived in next.config.mjs.
UPDATE public.events SET slug = 'ccsept5-2026' WHERE id = '1a020f09-f618-42ed-b646-75c1927da38a';
