-- IMPORTANT: This migration assumes all existing date values are in ISO format (YYYY-MM-DD).
-- Verify this before running in production. If any dates use other formats, update them first.
ALTER TABLE public.events ALTER COLUMN date TYPE DATE USING date::DATE;
