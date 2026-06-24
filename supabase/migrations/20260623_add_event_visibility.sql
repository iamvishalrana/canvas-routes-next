ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS registration_visibility TEXT DEFAULT 'members'
    CHECK (registration_visibility IN ('members', 'public'));
