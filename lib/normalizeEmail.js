// Strips invisible characters that some mobile keyboards/autofill paths can
// insert around an email (zero-width space, zero-width joiners, byte-order
// mark, non-breaking space) before the usual trim + lowercase. A plain
// .trim() only strips standard ASCII whitespace — it misses these, which can
// make an email that looks completely correct on screen fail an exact-match
// DB lookup. Built from character codes (not literal characters) so the
// invisible characters never end up embedded in this source file itself.
const INVISIBLE_CODE_POINTS = [0x200B, 0x200C, 0x200D, 0xFEFF, 0x00A0]
const INVISIBLE_CHARS_RE = new RegExp(
  '[' + INVISIBLE_CODE_POINTS.map(c => String.fromCharCode(c)).join('') + ']',
  'g'
)

export function normalizeEmail(raw) {
  return (raw || '')
    .replace(INVISIBLE_CHARS_RE, '')
    .trim()
    .toLowerCase()
}
