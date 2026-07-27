-- Free-text note per expense (e.g. "why this was bought", "reimbursed by X").
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS notes TEXT;
