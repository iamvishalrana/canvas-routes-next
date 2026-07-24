-- Resend webhook event log — gives visibility into bounces/complaints/deliveries
-- for every email we send, which we've had zero of until now (message_id was
-- only added to Resend's webhook payloads in their July 2026 release). Safe to
-- run multiple times.
CREATE TABLE IF NOT EXISTS public.email_events (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  svix_id            TEXT         UNIQUE NOT NULL, -- Svix delivery id — dedupes retried webhook deliveries
  resend_message_id  TEXT         NOT NULL,
  event_type         TEXT         NOT NULL, -- email.sent / .delivered / .delivery_delayed / .bounced / .complained / .opened / .clicked
  recipient          TEXT,
  subject            TEXT,
  from_address       TEXT,
  bounce_type        TEXT,        -- e.g. 'Permanent' / 'Transient' — only set on email.bounced
  occurred_at        TIMESTAMPTZ  NOT NULL, -- event's own created_at from the Resend payload
  raw                JSONB        NOT NULL,
  created_at         TIMESTAMPTZ  DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_events_message_id_idx ON public.email_events(resend_message_id);
CREATE INDEX IF NOT EXISTS email_events_recipient_idx ON public.email_events(recipient);
CREATE INDEX IF NOT EXISTS email_events_event_type_idx ON public.email_events(event_type);
CREATE INDEX IF NOT EXISTS email_events_occurred_at_idx ON public.email_events(occurred_at DESC);
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_direct_client_access" ON public.email_events;
CREATE POLICY "block_direct_client_access" ON public.email_events
  USING (false) WITH CHECK (false);
