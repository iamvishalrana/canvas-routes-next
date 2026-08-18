// Single source of truth for expense payment methods — used by the admin UI
// dropdowns/badges, both expense API routes' server-side validation, and the
// receipt-scanning AI prompt/validator. Before this, the same five values
// were hand-copied in four separate files; adding a method meant updating
// all four or one would silently drift (exactly the bug expenseCategories.js
// already documents for categories — same risk, same fix).
export const EXPENSE_PAYMENT_METHODS = [
  { value: 'cash',      label: 'Cash' },
  { value: 'credit',    label: 'Credit card' },
  { value: 'debit',     label: 'Debit card' },
  { value: 'etransfer', label: 'E-transfer' },
  { value: 'other',     label: 'Other' },
]

export const EXPENSE_PAYMENT_METHOD_VALUES = EXPENSE_PAYMENT_METHODS.map(m => m.value)

// Shorter labels for compact display (row badges, CSV/PDF exports) — distinct
// from the dropdown's fuller wording ("Credit card" vs "Card").
export const EXPENSE_PAYMENT_LABELS = {
  cash: 'Cash', credit: 'Card', debit: 'Debit', etransfer: 'E-transfer', other: 'Other',
}
