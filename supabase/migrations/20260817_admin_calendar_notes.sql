-- Free-text notes an admin can attach to any calendar day — shown alongside
-- events/birthdays on /admin/calendar and synced into the personal .ics feed
-- (see the admin_calendar_token row in settings, written by
-- app/api/admin/calendar/token/route.js). Admin-only, no client ever reads
-- or writes this table directly — only the service-role admin client and
-- the token-gated public .ics route (also service-role) touch it. Locked
-- down from creation the same way the rsvp_tokens fix had to retrofit, so
-- there's no window where a stray GRANT could expose it (service_role is
-- already covered automatically by 20260702_service_role_grants_all.sql's
-- default-privileges rule).
CREATE TABLE IF NOT EXISTS public.admin_calendar_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_date  DATE NOT NULL,
  content    TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_calendar_notes_date_idx ON public.admin_calendar_notes (note_date);

ALTER TABLE public.admin_calendar_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "block_direct_client_access" ON public.admin_calendar_notes
  USING (false) WITH CHECK (false);
