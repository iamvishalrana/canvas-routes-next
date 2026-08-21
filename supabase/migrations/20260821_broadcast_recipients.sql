-- Per-recipient send record for each broadcast — previously only an
-- aggregate sent_count/failed_count plus a jsonb list of FAILED recipients
-- existed on public.broadcasts; there was no way to know who successfully
-- received a broadcast, let alone whether it was delivered/opened/clicked/
-- bounced. resend_message_id is what links a row here to public.email_events
-- (the existing Resend webhook log, see 20260802_email_events.sql) — Resend's
-- batch send response guarantees array order matches the request payload
-- order, so the id captured at send time is reliably this exact recipient's
-- message, not a guess matched by email/subject/timestamp.
--
-- Null resend_message_id means the send itself failed (Resend never created
-- a message) — send_error holds why, mirroring broadcasts.failed_recipients'
-- existing {email,name,reason} shape rather than inventing a new one.
CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id       UUID         NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  email              TEXT         NOT NULL,
  name               TEXT,
  resend_message_id  TEXT,
  send_error         TEXT,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS broadcast_recipients_broadcast_idx ON public.broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS broadcast_recipients_message_id_idx ON public.broadcast_recipients(resend_message_id);

ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_direct_client_access" ON public.broadcast_recipients;
CREATE POLICY "block_direct_client_access" ON public.broadcast_recipients
  USING (false) WITH CHECK (false);
