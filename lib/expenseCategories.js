// Single source of truth for expense categories — used by the admin UI
// dropdown and the receipt-scanning AI prompt/validator. Keeping these in
// sync in two places was a bug risk: a category added to one but not the
// other would either be silently rejected by the scanner or show up in the
// UI with no matching option.
export const EXPENSE_CATEGORIES = ['Fuel', 'Food & Beverages', 'Venue / Parking', 'Photography / Video', 'Merchandise', 'Equipment', 'Marketing', 'Insurance', 'Printing', 'Other']

// CRA (Income Tax Act s.67.1) caps meals & entertainment expenses at 50%
// deductible for business tax purposes — Revenu Québec applies the same 50%
// limit to the QST input tax credit on these purchases. 'Food & Beverages'
// is the only category that rule applies to; everything else is treated as
// fully deductible, the normal case for ordinary business expenses. Used to
// estimate a tax-deductible total for planning purposes — not tax advice,
// there are exceptions (e.g. a fully-deductible staff event) an accountant
// should confirm.
export const MEALS_ENTERTAINMENT_CATEGORY = 'Food & Beverages'
export const MEALS_ENTERTAINMENT_DEDUCTIBLE_RATE = 0.5
