// Single source of truth for expense tax jurisdictions — Canadian
// provinces/territories plus the US border states road trips commonly cross
// into. Used by the admin UI (province dropdown + auto tax-split + ITC
// recoverability), the two expense API routes, and the receipt-scanning AI
// prompt/validator. Previously the code list was hand-duplicated between the
// UI and the OCR validator with only a comment holding them in sync — this
// removes that risk structurally instead of relying on someone remembering
// to update both.
//
// `gst` / `prov` are tax-inclusive-total split rates: `gst` is the Canadian
// federal component (0 for US states — there is no GST), `prov` is the
// provincial/territorial/state component. `provLabel` is what the second tax
// column is called for that jurisdiction (QST / HST / PST / Sales Tax).
//
// `provRecoverable` marks whether the PROVINCIAL portion is claimable as an
// input tax credit alongside GST. True for QST (Quebec's parallel ITC/ITR
// mechanism) and the provincial slice of HST (federally harmonized, so it
// flows through the same GST/HST return) — false for a standalone Retail
// Sales Tax (BC/MB/SK PST) or any US state sales tax, neither of which a
// Canadian GST/HST registrant can claim back. GST itself is always
// recoverable regardless of province.
export const EXPENSE_PROVINCES = [
  { value: 'QC',   label: 'Quebec',                 gst: 0.05, prov: 0.09975, provLabel: 'QST', provRecoverable: true },
  { value: 'ON',   label: 'Ontario',                gst: 0.05, prov: 0.08,    provLabel: 'HST', provRecoverable: true },
  { value: 'BC',   label: 'British Columbia',       gst: 0.05, prov: 0.07,    provLabel: 'PST', provRecoverable: false },
  { value: 'AB',   label: 'Alberta',                gst: 0.05, prov: 0,       provLabel: 'PST', provRecoverable: false },
  { value: 'MB',   label: 'Manitoba',               gst: 0.05, prov: 0.07,    provLabel: 'PST', provRecoverable: false },
  { value: 'SK',   label: 'Saskatchewan',           gst: 0.05, prov: 0.06,    provLabel: 'PST', provRecoverable: false },
  { value: 'NS',   label: 'Nova Scotia',            gst: 0.05, prov: 0.09,    provLabel: 'HST', provRecoverable: true },
  { value: 'NB',   label: 'New Brunswick',          gst: 0.05, prov: 0.10,    provLabel: 'HST', provRecoverable: true },
  { value: 'NL',   label: 'Newfoundland & Lab.',    gst: 0.05, prov: 0.10,    provLabel: 'HST', provRecoverable: true },
  { value: 'PE',   label: 'Prince Edward Island',   gst: 0.05, prov: 0.10,    provLabel: 'HST', provRecoverable: true },
  { value: 'YT',   label: 'Yukon',                  gst: 0.05, prov: 0,       provLabel: 'PST', provRecoverable: false },
  { value: 'NT',   label: 'Northwest Territories',  gst: 0.05, prov: 0,       provLabel: 'PST', provRecoverable: false },
  { value: 'NU',   label: 'Nunavut',                gst: 0.05, prov: 0,       provLabel: 'PST', provRecoverable: false },
  // Border US states for road trips that cross into New England/NY. No GST —
  // it's a single state sales tax — and never recoverable (no Canadian ITC on
  // a foreign purchase). NY's rate varies by locality (4%–8.875%); 8.52% is
  // the commonly-cited state+average-local combined rate — adjust per-receipt
  // via the GST/Sales Tax field if the actual receipt shows a different cut.
  { value: 'VT',   label: 'Vermont, USA',           gst: 0,    prov: 0.06,    provLabel: 'Sales Tax', provRecoverable: false },
  { value: 'NH',   label: 'New Hampshire, USA',     gst: 0,    prov: 0,       provLabel: 'Sales Tax', provRecoverable: false },
  { value: 'ME',   label: 'Maine, USA',             gst: 0,    prov: 0.055,   provLabel: 'Sales Tax', provRecoverable: false },
  { value: 'NY',   label: 'New York, USA',          gst: 0,    prov: 0.0852,  provLabel: 'Sales Tax', provRecoverable: false },
  { value: 'NONE', label: 'No tax / Other',         gst: 0,    prov: 0,       provLabel: 'Tax', provRecoverable: false },
]

export const EXPENSE_PROVINCE_MAP = Object.fromEntries(EXPENSE_PROVINCES.map(p => [p.value, p]))
export const EXPENSE_PROVINCE_VALUES = EXPENSE_PROVINCES.map(p => p.value)
