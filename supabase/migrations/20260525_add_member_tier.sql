ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS tier TEXT CHECK (tier IN ('routes_member', 'inner_circle'));
