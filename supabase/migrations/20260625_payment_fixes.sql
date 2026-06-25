-- Add stripe_amount_refunded column to applications
-- Previously the webhook wrote this field but it did not exist, causing silent no-ops.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS stripe_amount_refunded integer;

-- Expand event_registrations.stripe_payment_status CHECK constraint to include dispute statuses
-- Required so the webhook can update event registrations when a dispute is created/resolved.
ALTER TABLE public.event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_stripe_payment_status_check;

ALTER TABLE public.event_registrations
  ADD CONSTRAINT event_registrations_stripe_payment_status_check
  CHECK (stripe_payment_status IN ('free', 'pending', 'paid', 'failed', 'refunded', 'disputed', 'disputed_won', 'disputed_lost'));
