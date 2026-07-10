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
  tier          TEXT CHECK (tier IN ('routes_member', 'inner_circle')),
  car_photo_url TEXT,
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
  type             TEXT DEFAULT 'Meet',
  registration_url TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
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

-- Applications (membership application submissions)
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  instagram TEXT,
  car_year TEXT,
  car_make TEXT,
  car_model TEXT,
  car_paint TEXT,
  source TEXT,
  more TEXT,
  dob_month SMALLINT,
  dob_day SMALLINT,
  dob_year SMALLINT,
  passengers TEXT,
  has_children TEXT,
  children_ages TEXT,
  registrations JSONB DEFAULT '[]',
  reregistered_at TIMESTAMPTZ,
  referred_by TEXT,
  notes TEXT,
  admin_notes TEXT,
  stripe_payment_intent_id TEXT,
  stripe_payment_status TEXT,
  stripe_amount_paid INTEGER,
  stripe_payment_type TEXT,
  stripe_paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
-- Admin routes use service role key which bypasses RLS; this policy blocks direct client access
CREATE POLICY IF NOT EXISTS "block_direct_client_access" ON public.applications
  USING (false) WITH CHECK (false);

-- Contacts (CRM layer on top of applications)
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  notes TEXT,
  car_paint TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "block_direct_client_access" ON public.contacts
  USING (false) WITH CHECK (false);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE           NOT NULL,
  event_name   TEXT,
  vendor       TEXT,
  amount       NUMERIC(10,2)  NOT NULL DEFAULT 0,
  tax_amount   NUMERIC(10,2)  NOT NULL DEFAULT 0,  -- legacy: superseded by gst_amount + qst_amount
  gst_amount   NUMERIC(10,2)  NOT NULL DEFAULT 0,
  qst_amount   NUMERIC(10,2)  NOT NULL DEFAULT 0,
  province     TEXT           NOT NULL DEFAULT 'QC',
  payment_method TEXT         CHECK (payment_method IN ('cash', 'credit', 'etransfer', 'other')),
  category     TEXT,
  receipt_url  TEXT,
  created_at   TIMESTAMPTZ    DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "block_direct_client_access" ON public.expenses
  USING (false) WITH CHECK (false);

-- Upcoming Roadtrips (public /routes hub). interested_count is a live aggregate
-- from route_interest, never stored on the route row.
CREATE TABLE IF NOT EXISTS public.upcoming_routes (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT          UNIQUE NOT NULL,
  name           TEXT          NOT NULL,
  destination    TEXT          NOT NULL,
  month_label    TEXT          NOT NULL,
  description    TEXT          NOT NULL DEFAULT '',
  duration_label TEXT          NOT NULL DEFAULT '',
  distance_label TEXT          NOT NULL DEFAULT '',
  target_count   INT           NOT NULL DEFAULT 12 CHECK (target_count > 0),
  sort_order     INT           NOT NULL DEFAULT 0,
  trip_type      TEXT          NOT NULL DEFAULT 'day' CHECK (trip_type IN ('day', 'overnight', 'multi_day')),
  price_per_car  NUMERIC(10,2),
  max_cars       INT,
  itinerary      TEXT          NOT NULL DEFAULT '',
  activity_options JSONB       NOT NULL DEFAULT '[]'::jsonb,
  is_active      BOOLEAN       NOT NULL DEFAULT true,
  launched       BOOLEAN       NOT NULL DEFAULT false,
  launched_at    TIMESTAMPTZ,
  threshold_notified_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ   DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.route_interest (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id         UUID        NOT NULL REFERENCES public.upcoming_routes(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  email            TEXT        NOT NULL,
  phone            TEXT,
  car              TEXT,
  preferences      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  membership_optin BOOLEAN     NOT NULL DEFAULT false,
  is_member        BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (route_id, email)
);
CREATE INDEX IF NOT EXISTS route_interest_route_id_idx ON public.route_interest (route_id);
ALTER TABLE public.upcoming_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_interest  ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_direct_client_access" ON public.upcoming_routes;
CREATE POLICY "block_direct_client_access" ON public.upcoming_routes
  USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "block_direct_client_access" ON public.route_interest;
CREATE POLICY "block_direct_client_access" ON public.route_interest
  USING (false) WITH CHECK (false);
