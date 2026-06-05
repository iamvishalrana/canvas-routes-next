-- audience column on announcements (used in POST and PATCH handlers)
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS audience TEXT DEFAULT 'all';

-- event_attendance on members (in members/[id] PATCH allowlist)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS event_attendance JSONB DEFAULT '{}';

-- Stripe payment tracking on applications (written by stripe webhook handler)
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS stripe_payment_status TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS stripe_amount_paid INTEGER;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS stripe_payment_type TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS stripe_paid_at TIMESTAMPTZ;
