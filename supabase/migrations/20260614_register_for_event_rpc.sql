-- Atomic event registration: locks the event row so concurrent requests can't
-- both pass the capacity check simultaneously.
CREATE OR REPLACE FUNCTION public.register_for_event(
  p_event_id                UUID,
  p_member_id               UUID,
  p_email                   TEXT,
  p_name                    TEXT,
  p_stripe_payment_intent_id TEXT,
  p_stripe_payment_status   TEXT,
  p_amount_paid             INTEGER
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
    stripe_payment_intent_id, stripe_payment_status, amount_paid
  ) VALUES (
    p_event_id, p_member_id, p_email, p_name,
    p_stripe_payment_intent_id, p_stripe_payment_status, p_amount_paid
  )
  ON CONFLICT ON CONSTRAINT uq_event_reg_event_member DO UPDATE SET
    email                    = EXCLUDED.email,
    name                     = EXCLUDED.name,
    stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
    stripe_payment_status    = EXCLUDED.stripe_payment_status,
    amount_paid              = EXCLUDED.amount_paid;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_for_event TO service_role;
