-- Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE           NOT NULL,
  event_name   TEXT,
  vendor       TEXT,
  amount       NUMERIC(10,2)  NOT NULL DEFAULT 0,
  tax_amount   NUMERIC(10,2)  NOT NULL DEFAULT 0,
  category     TEXT,
  receipt_url  TEXT,
  created_at   TIMESTAMPTZ    DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "block_direct_client_access" ON public.expenses
  USING (false) WITH CHECK (false);

-- Storage bucket for receipts (public read, admin write via service role)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "Public read receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts');
