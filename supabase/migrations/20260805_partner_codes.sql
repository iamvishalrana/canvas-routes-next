-- One-time discount codes for partners that share a finite pool (e.g. Skyline
-- Luge Tremblant's 10%-off codes) rather than one shared code for everyone.
-- Each member permanently claims exactly one code per partner via the
-- claim_partner_code RPC, so Jerry can see at a glance which codes are used
-- and by whom (previously no tracking existed at all).
CREATE TABLE IF NOT EXISTS public.partner_codes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_slug  TEXT        NOT NULL,
  code          TEXT        NOT NULL,
  assigned_to   UUID        REFERENCES public.members(id) ON DELETE SET NULL,
  assigned_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (partner_slug, code)
);
CREATE INDEX IF NOT EXISTS partner_codes_partner_idx ON public.partner_codes (partner_slug);
-- A member can only ever hold one code per partner.
CREATE UNIQUE INDEX IF NOT EXISTS partner_codes_one_per_member
  ON public.partner_codes (partner_slug, assigned_to) WHERE assigned_to IS NOT NULL;

ALTER TABLE public.partner_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_direct_client_access" ON public.partner_codes;
CREATE POLICY "block_direct_client_access" ON public.partner_codes
  USING (false) WITH CHECK (false);

-- Atomic claim: returns the member's existing code if they already have one
-- (idempotent "reveal"), otherwise locks and hands out one unused code.
-- FOR UPDATE SKIP LOCKED means two members clicking at the same instant can
-- never be handed the same code, and never collide/block on each other.
CREATE OR REPLACE FUNCTION public.claim_partner_code(p_partner_slug TEXT, p_member_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
BEGIN
  SELECT code INTO v_code FROM public.partner_codes
  WHERE partner_slug = p_partner_slug AND assigned_to = p_member_id;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  SELECT code INTO v_code FROM public.partner_codes
  WHERE partner_slug = p_partner_slug AND assigned_to IS NULL
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_code IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.partner_codes
  SET assigned_to = p_member_id, assigned_at = now()
  WHERE partner_slug = p_partner_slug AND code = v_code;

  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_partner_code(TEXT, UUID) TO service_role;

-- Skyline Luge Tremblant's 10%-off code pool, shared with Canvas Routes.
-- ON CONFLICT DO NOTHING makes this migration safe to re-run.
INSERT INTO public.partner_codes (partner_slug, code) VALUES
  ('skyline-luge-tremblant', '22S6PV2Q'),
  ('skyline-luge-tremblant', '2DNVLKQL'),
  ('skyline-luge-tremblant', '2GCHU7JS'),
  ('skyline-luge-tremblant', '2T5I5UCK'),
  ('skyline-luge-tremblant', '32A7RU55'),
  ('skyline-luge-tremblant', '32NVQSLI'),
  ('skyline-luge-tremblant', '395S4WIV'),
  ('skyline-luge-tremblant', '3BQUJAL6'),
  ('skyline-luge-tremblant', '3IMJ2LZK'),
  ('skyline-luge-tremblant', '3NLV76QC'),
  ('skyline-luge-tremblant', '3PNDJQPL'),
  ('skyline-luge-tremblant', '3WAGXSMK'),
  ('skyline-luge-tremblant', '4836478Z'),
  ('skyline-luge-tremblant', '4CUSWNA6'),
  ('skyline-luge-tremblant', '4ECWK2IY'),
  ('skyline-luge-tremblant', '4FU74AAB'),
  ('skyline-luge-tremblant', '4PXQ6SCQ'),
  ('skyline-luge-tremblant', '58YNTX7L'),
  ('skyline-luge-tremblant', '627C77UZ'),
  ('skyline-luge-tremblant', '693MZNA7'),
  ('skyline-luge-tremblant', '6B8UALRN'),
  ('skyline-luge-tremblant', '6FTYDSMT'),
  ('skyline-luge-tremblant', '6KN8VZCP'),
  ('skyline-luge-tremblant', '6LB73LVU'),
  ('skyline-luge-tremblant', '6UCRGV7P'),
  ('skyline-luge-tremblant', '72VN3YNH'),
  ('skyline-luge-tremblant', '7B73WK2U'),
  ('skyline-luge-tremblant', '7FUJF3S8'),
  ('skyline-luge-tremblant', '7HISNURS'),
  ('skyline-luge-tremblant', '7LF6J7DY'),
  ('skyline-luge-tremblant', '7SDDLZHN'),
  ('skyline-luge-tremblant', '7XLNJSMX'),
  ('skyline-luge-tremblant', '85JBUQFN'),
  ('skyline-luge-tremblant', '8CFAVMQX'),
  ('skyline-luge-tremblant', '8HDQRJY7'),
  ('skyline-luge-tremblant', '8NHPBZ8J'),
  ('skyline-luge-tremblant', '8QUPAR77'),
  ('skyline-luge-tremblant', '96J9UCVZ'),
  ('skyline-luge-tremblant', '9RFEZGVW'),
  ('skyline-luge-tremblant', '9RUDGLSX'),
  ('skyline-luge-tremblant', '9WGPKSHE'),
  ('skyline-luge-tremblant', 'A96AF2RC'),
  ('skyline-luge-tremblant', 'AIZJKKBR'),
  ('skyline-luge-tremblant', 'ARYNCAPT'),
  ('skyline-luge-tremblant', 'AXNBXTGF'),
  ('skyline-luge-tremblant', 'B2RZCWTH'),
  ('skyline-luge-tremblant', 'B7NQWF93'),
  ('skyline-luge-tremblant', 'BBTBNC3S'),
  ('skyline-luge-tremblant', 'BDHNABQ2')
ON CONFLICT (partner_slug, code) DO NOTHING;
