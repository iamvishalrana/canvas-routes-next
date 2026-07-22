-- Tracks which language a person registered/applied in, so admins can see it
-- in the Registrants view without needing to look up the Stripe PaymentIntent.
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS lang TEXT CHECK (lang IN ('en', 'fr'));
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS lang TEXT CHECK (lang IN ('en', 'fr'));

-- register_for_event's signature changes (new p_lang param) — drop first so
-- CREATE OR REPLACE doesn't leave an ambiguous overload behind.
DROP FUNCTION IF EXISTS public.register_for_event(UUID, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.register_for_event(
  p_event_id                UUID,
  p_member_id               UUID,
  p_email                   TEXT,
  p_name                    TEXT,
  p_stripe_payment_intent_id TEXT,
  p_stripe_payment_status   TEXT,
  p_amount_paid             INTEGER,
  p_lang                    TEXT DEFAULT 'en'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_capacity     INTEGER;
  v_current_count BIGINT;
BEGIN
  -- Row-level lock on the event serialises concurrent registrations for the same event
  SELECT capacity INTO v_capacity
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF v_capacity IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM public.event_registrations
    WHERE event_id = p_event_id
      AND stripe_payment_status IN ('free', 'paid');

    IF v_current_count >= v_capacity THEN
      RETURN jsonb_build_object('error', 'This event is at capacity.');
    END IF;
  END IF;

  INSERT INTO public.event_registrations (
    event_id, member_id, email, name,
    stripe_payment_intent_id, stripe_payment_status, amount_paid, lang
  ) VALUES (
    p_event_id, p_member_id, p_email, p_name,
    p_stripe_payment_intent_id, p_stripe_payment_status, p_amount_paid,
    CASE WHEN p_lang = 'fr' THEN 'fr' ELSE 'en' END
  )
  ON CONFLICT ON CONSTRAINT uq_event_reg_event_member DO UPDATE SET
    email                    = EXCLUDED.email,
    name                     = EXCLUDED.name,
    stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
    stripe_payment_status    = EXCLUDED.stripe_payment_status,
    amount_paid              = EXCLUDED.amount_paid,
    lang                     = EXCLUDED.lang;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_for_event TO service_role;
