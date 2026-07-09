-- Expenses: add payment method, province, and a GST/QST tax split.
--
-- payment_method — how the expense was paid, for bank/Stripe reconciliation.
-- province       — where it was spent; drives the auto tax rate (default Quebec).
-- gst_amount / qst_amount — the tax split. The legacy single `tax_amount` column
--   is kept so pre-existing rows still show their tax (the UI falls back to it
--   when gst+qst is zero); new rows write 0 to tax_amount and use the split.

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS payment_method TEXT
    CHECK (payment_method IN ('cash', 'credit', 'etransfer', 'other')),
  ADD COLUMN IF NOT EXISTS province   TEXT          NOT NULL DEFAULT 'QC',
  ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qst_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
