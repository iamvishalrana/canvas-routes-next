-- Member profile picture (separate from the car photo). Safe to run twice.
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
