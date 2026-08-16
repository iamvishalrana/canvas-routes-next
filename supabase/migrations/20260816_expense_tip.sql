-- Tip / gratuity on an expense (restaurants). Tips sit on top of the taxed
-- subtotal — they carry no GST/QST and aren't tax-recoverable — so they're
-- tracked in their own column and only added into the grand total, never the
-- tax figures. amount stays the pre-tax subtotal; grand total = amount + gst +
-- qst + tip_amount.
alter table public.expenses
  add column if not exists tip_amount numeric not null default 0;
