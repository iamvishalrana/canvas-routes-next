-- Payment flow hardening. Safe to run multiple times.

-- 1. Atomic email-dedup gate for the membership flow: exactly one caller per
--    PaymentIntent claims the confirmation emails (3DS redirect + normal flow
--    can both fire /api/membership-waitlist; the conditional UPDATE on this
--    column is serialized by the row lock, so duplicates skip the send).
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS waitlist_notified_pi TEXT;

-- 2. The webhook writes dispute statuses to event_registrations, but the
--    original CHECK constraint only allowed free/pending/paid/failed/refunded —
--    every dispute update was silently rejected. Allow the full status set.
ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS event_registrations_stripe_payment_status_check;
ALTER TABLE public.event_registrations ADD CONSTRAINT event_registrations_stripe_payment_status_check
  CHECK (stripe_payment_status IN ('free', 'pending', 'paid', 'failed', 'refunded', 'disputed', 'disputed_won', 'disputed_lost'));
