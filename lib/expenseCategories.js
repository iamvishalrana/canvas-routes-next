// Single source of truth for expense categories — used by the admin UI
// dropdown and the receipt-scanning AI prompt/validator. Keeping these in
// sync in two places was a bug risk: a category added to one but not the
// other would either be silently rejected by the scanner or show up in the
// UI with no matching option.
export const EXPENSE_CATEGORIES = ['Fuel', 'Food & Beverages', 'Venue / Parking', 'Photography / Video', 'Merchandise', 'Equipment', 'Marketing', 'Insurance', 'Printing', 'Other']
