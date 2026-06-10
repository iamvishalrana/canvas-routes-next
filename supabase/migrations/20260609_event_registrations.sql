-- Add registration fields to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS member_price INTEGER; -- cents CAD
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS priority_window_end TIMESTAMPTZ; -- IC-only until this time

-- Event registrations
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id                UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   TEXT NOT NULL,
  name                    TEXT,
  stripe_payment_intent_id TEXT,
  stripe_payment_status   TEXT CHECK (stripe_payment_status IN ('free', 'pending', 'paid', 'failed', 'refunded')),
  amount_paid             INTEGER,
  registered_at           TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_event_reg_event_member UNIQUE(event_id, member_id)
);

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_registrations_select_own" ON public.event_registrations
  FOR SELECT USING (auth.uid() = member_id);
