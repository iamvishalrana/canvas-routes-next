-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Members (linked 1:1 to auth.users)
CREATE TABLE public.members (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name          TEXT,
  email         TEXT,
  phone         TEXT,
  instagram     TEXT,
  car_year      TEXT,
  car_make      TEXT,
  car_model     TEXT,
  cars          JSONB,
  dob_day       SMALLINT,
  dob_month     SMALLINT,
  dob_year      SMALLINT,
  membership_status TEXT DEFAULT 'pending'
                CHECK (membership_status IN ('pending','active','suspended','expired')),
  join_date     TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements
CREATE TABLE public.announcements (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  published  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE public.events (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,
  date        TEXT NOT NULL,
  location    TEXT,
  description TEXT,
  type        TEXT DEFAULT 'Meet',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events        ENABLE ROW LEVEL SECURITY;

-- Members: read and update own row only
CREATE POLICY "members_select_own" ON public.members
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "members_update_own" ON public.members
  FOR UPDATE USING (auth.uid() = id);

-- Announcements: authenticated users can read published ones
CREATE POLICY "announcements_select" ON public.announcements
  FOR SELECT USING (published = TRUE AND auth.role() = 'authenticated');

-- Events: all authenticated users can read
CREATE POLICY "events_select" ON public.events
  FOR SELECT USING (auth.role() = 'authenticated');

-- Note: admin operations use the service role key which bypasses RLS entirely.
