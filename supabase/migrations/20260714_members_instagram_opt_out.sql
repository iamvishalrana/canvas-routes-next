-- Lets a member explicitly say "I don't want to share Instagram" so the
-- profile-completeness nudge stops asking every time they visit — without
-- this, a member with no Instagram account can never reach 100% complete.
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS instagram_opted_out BOOLEAN NOT NULL DEFAULT false;
