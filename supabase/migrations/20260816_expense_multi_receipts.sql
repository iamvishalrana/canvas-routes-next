-- Multiple attachments per expense — e.g. an invoice AND its card receipt.
-- receipt_urls holds the full list (JSON array of public URLs). The legacy
-- single receipt_url column is kept in sync as receipt_urls[0] so every
-- existing display/query that reads receipt_url keeps working unchanged.
alter table public.expenses
  add column if not exists receipt_urls jsonb not null default '[]'::jsonb;

-- Backfill: any row that already has a single receipt becomes a one-element list.
update public.expenses
  set receipt_urls = to_jsonb(array[receipt_url])
  where receipt_url is not null
    and (receipt_urls is null or jsonb_array_length(receipt_urls) = 0);
