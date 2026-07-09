-- Upcoming Roadtrips — interest-registration feature (public /routes hub).
--
-- upcoming_routes  — the editable list of planned routes (CMS-style, no deploy
--                    needed to add/remove/edit). interested_count is NOT stored
--                    here; it is a live aggregate from route_interest.
-- route_interest   — one row per person per route who expressed interest.
--                    UNIQUE(route_id, email) keeps re-submits idempotent.
--
-- Both tables block all direct client access; everything goes through the
-- service-role API routes (public GET/POST + admin CRUD), matching expenses.

CREATE TABLE IF NOT EXISTS public.upcoming_routes (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT          UNIQUE NOT NULL,
  name           TEXT          NOT NULL,
  destination    TEXT          NOT NULL,
  month_label    TEXT          NOT NULL,          -- e.g. "July 2026", "Early Oct 2026"
  description    TEXT          NOT NULL DEFAULT '',
  duration_label TEXT          NOT NULL DEFAULT '', -- e.g. "1 day"
  distance_label TEXT          NOT NULL DEFAULT '', -- e.g. "780 km (roundtrip)"
  target_count   INT           NOT NULL DEFAULT 12 CHECK (target_count > 0),
  sort_order     INT           NOT NULL DEFAULT 0,
  is_active      BOOLEAN       NOT NULL DEFAULT true,   -- show on the public page
  launched       BOOLEAN       NOT NULL DEFAULT false,  -- threshold met + launch email sent
  launched_at    TIMESTAMPTZ,
  threshold_notified_at TIMESTAMPTZ,                    -- admin alerted the count hit target
  created_at     TIMESTAMPTZ   DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.route_interest (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id         UUID        NOT NULL REFERENCES public.upcoming_routes(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  email            TEXT        NOT NULL,
  membership_optin BOOLEAN     NOT NULL DEFAULT false,
  is_member        BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (route_id, email)
);

CREATE INDEX IF NOT EXISTS route_interest_route_id_idx ON public.route_interest (route_id);

ALTER TABLE public.upcoming_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_interest  ENABLE ROW LEVEL SECURITY;
-- Postgres has no CREATE POLICY IF NOT EXISTS; drop-then-create is the idempotent form.
DROP POLICY IF EXISTS "block_direct_client_access" ON public.upcoming_routes;
CREATE POLICY "block_direct_client_access" ON public.upcoming_routes
  USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "block_direct_client_access" ON public.route_interest;
CREATE POLICY "block_direct_client_access" ON public.route_interest
  USING (false) WITH CHECK (false);

-- Seed the current 2026 season (safe to re-run — slug is unique, ON CONFLICT skips)
INSERT INTO public.upcoming_routes (slug, name, destination, month_label, description, duration_label, distance_label, target_count, sort_order) VALUES
  ('memoirs-to-charlevoix', 'Memoirs to Charlevoix', 'Charlevoix, QC',  'July 2026',      'Where the mountains meet the St. Lawrence. Dramatic elevation changes, sweeping river views, and roads carved by nature itself. A single long day from Montreal — and worth every kilometre.',          '1 day',  '780 km (roundtrip)',   12, 1),
  ('the-gaspesie-odyssey',  'The Gaspésie Odyssey',  'Gaspésie, QC',    'August 2026',    'The full Gaspé peninsula loop — Gulf cliffs, Chic-Choc mountains, and open straights with almost no traffic. Three days, nearly 2,000 km from Montreal and back. A driver''s true odyssey.',            '3 days', '1,850 km (roundtrip)', 15, 2),
  ('the-tobermory-story',   'The Tobermory Story',   'Tobermory, ON',   'August 2026',    'Up the Bruce Peninsula to land''s end. Georgian Bay on one side, Lake Huron on the other. Two days, tight cedar-lined two-lanes, and a ferry if you want it. Every turn tells a story.',               '2 days', '1,420 km (roundtrip)', 12, 3),
  ('the-calabogie-boogie',  'The Calabogie Boogie',  'Calabogie, ON',   'September 2026', 'A tight, technical day loop through Lanark County — Highlands backroads, the lake at midday, and a pass around the Calabogie circuit to finish. Close enough for a long day from Montreal.',           '1 day',  '580 km (roundtrip)',   12, 4),
  ('the-cabot-trail-grail', 'The Cabot Trail Grail', 'Cape Breton, NS', 'Early Oct 2026', 'Widely regarded as the most beautiful road in the world. Clifftop switchbacks, the Atlantic below, peak autumn colour above. Five days from Montreal and back — the holy grail of Canadian driving.', '5 days', '3,100 km (roundtrip)', 15, 5)
ON CONFLICT (slug) DO NOTHING;
