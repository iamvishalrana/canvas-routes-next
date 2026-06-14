-- Missing GRANTs from 20260609_event_registrations.sql
-- service_role needs ALL to bypass RLS restrictions at the table level
GRANT ALL ON TABLE public.event_registrations TO service_role;
-- authenticated role needs SELECT so RLS policies can evaluate, and INSERT for direct member writes
GRANT SELECT, INSERT ON TABLE public.event_registrations TO authenticated;
