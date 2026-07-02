-- Atomic confirmation-email claim for member event registrations.
-- The register API route and the Stripe webhook can both complete the same
-- registration (3DS redirects skip the client's register call entirely).
-- Whoever wins the conditional UPDATE on this column sends the confirmation
-- email — exactly once, no matter which path lands first. Safe to run twice.
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;
