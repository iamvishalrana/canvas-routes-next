-- referred_by was added to schema.sql on 2026-06-09 (commit 1fabae4) but no
-- migration file was ever created, so production never got the column. Every
-- membership-waitlist upsert that includes referred_by fails PostgREST
-- schema-cache validation (Sentry: "Could not find the 'referred_by' column
-- of 'applications'") and the row only survives via the webhook rescue path,
-- which doesn't carry referred_by — so the referral answer is silently lost.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS referred_by TEXT;
