-- Member's chosen portal language (EN/FR), set from the buried Settings
-- section on their profile page. Defaults to English; safe to run twice.
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_language_check;
ALTER TABLE public.members ADD CONSTRAINT members_language_check CHECK (language IN ('en', 'fr'));
