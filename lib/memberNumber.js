// membership_number is stored as free-text, zero-padded to STORAGE_WIDTH so a
// plain lexicographic sort on the column (e.g. `.order('membership_number')`)
// matches numeric order regardless of magnitude ("000042" < "000100"). Every
// write must go through padForStorage(); every display must go through
// formatForDisplay(), which parses back to a number first so padding changes
// here never affect the "#001"-style badge shown throughout the site.
const STORAGE_WIDTH = 6
const DISPLAY_WIDTH = 3

export function padForStorage(raw) {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return trimmed // non-numeric — leave as-is rather than silently dropping it
  return digits.padStart(STORAGE_WIDTH, '0')
}

export function formatForDisplay(raw) {
  if (raw === null || raw === undefined || raw === '') return null
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? String(n).padStart(DISPLAY_WIDTH, '0') : String(raw)
}
