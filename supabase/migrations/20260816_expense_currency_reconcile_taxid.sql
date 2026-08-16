-- Three overlooked expense features:
--   vendor_tax_id  — the vendor's GST/QST registration number (CRA requires it
--                    on receipts over $150 to claim input tax credits).
--   reconciled     — ticked off once matched against the card/bank statement.
--   currency /     — foreign purchases (e.g. US car parts). The amount/gst/qst/
--   original_amount  tip columns stay in CAD (the reporting currency); currency
--                    + original_amount just record what the receipt was in.
alter table public.expenses
  add column if not exists vendor_tax_id   text,
  add column if not exists reconciled      boolean not null default false,
  add column if not exists currency        text not null default 'CAD',
  add column if not exists original_amount numeric;
