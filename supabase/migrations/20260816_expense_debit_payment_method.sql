-- Add 'debit' to the allowed expense payment methods. The original CHECK only
-- permitted cash/credit/etransfer/other, so saving a debit-card expense failed
-- with expenses_payment_method_check. NULL stays allowed (unset).
alter table public.expenses
  drop constraint if exists expenses_payment_method_check;
alter table public.expenses
  add constraint expenses_payment_method_check
  check (payment_method is null or payment_method in ('cash', 'credit', 'debit', 'etransfer', 'other'));
