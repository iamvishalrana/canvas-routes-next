-- Tax + receipt retention + real promo-code redemption tracking. Safe to run multiple times.

-- 1. Canvas Routes' own record of every completed payment (subtotal/GST/QST/
--    total breakdown + when the branded receipt email was sent). Mirrors the
--    tax-split pattern already used on the expenses table, but for revenue
--    rather than outgoing spend. Amounts are cents (matches
--    applications.stripe_amount_paid), not dollars like expenses, since
--    they're derived directly from Stripe's own cent-based PaymentIntents.
CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id  TEXT         UNIQUE NOT NULL,
  email                     TEXT         NOT NULL,
  name                      TEXT,
  payment_type              TEXT,
  subtotal_amount           INTEGER      NOT NULL,
  gst_amount                INTEGER      NOT NULL,
  qst_amount                INTEGER      NOT NULL,
  discount_amount           INTEGER      NOT NULL DEFAULT 0,
  total_amount              INTEGER      NOT NULL,
  currency                  TEXT         NOT NULL DEFAULT 'cad',
  promo_code_id             TEXT,
  receipt_sent_at           TIMESTAMPTZ,
  paid_at                   TIMESTAMPTZ  NOT NULL,
  created_at                TIMESTAMPTZ  DEFAULT now()
);
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_direct_client_access" ON public.payment_receipts;
CREATE POLICY "block_direct_client_access" ON public.payment_receipts
  USING (false) WITH CHECK (false);

-- 2. Real promo-code redemption tracking. This integration never uses Stripe
--    Checkout/Invoices, so Stripe's own promotion-code times_redeemed counter
--    never increments — a "max 1 use" code could be reused indefinitely with
--    nothing to stop it. One row per PaymentIntent that actually succeeded
--    with a promo code attached; apply-promo checks this count against
--    max_redemptions before granting a new discount.
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id             TEXT         NOT NULL,
  code                      TEXT,
  stripe_payment_intent_id  TEXT         UNIQUE NOT NULL,
  email                     TEXT,
  discount_amount           INTEGER      NOT NULL DEFAULT 0,
  redeemed_at               TIMESTAMPTZ  DEFAULT now()
);
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_direct_client_access" ON public.promo_redemptions;
CREATE POLICY "block_direct_client_access" ON public.promo_redemptions
  USING (false) WITH CHECK (false);
CREATE INDEX IF NOT EXISTS promo_redemptions_promo_code_id_idx ON public.promo_redemptions(promo_code_id);
