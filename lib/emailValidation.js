// Base shape check — local@domain.tld, no spaces. Deliberately permissive
// (doesn't validate real TLDs) since that was the whole codebase's shared
// email regex before this file existed.
const EMAIL_SHAPE_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// TLD strings that are not real, registered top-level domains — each one is a
// keyboard-adjacent or transposed typo of a common real TLD (almost always
// .com). None of these exist in the DNS root zone, so rejecting them can never
// bounce a real, deliverable address. Added after a Cars & Coffee Sept 2026
// registration went through with "...@gmail.con" — the base regex above only
// checks there's *a* dot-something at the end, not that the something is real.
const INVALID_TLDS = new Set([
  'con', 'comm', 'cmo', 'ocm', 'xom', 'vom', 'dom', 'som',
  'coj', 'cpm', 'clm', 'cin', 'coom', 'cok', 'cim',
])

export function isValidEmail(email) {
  const trimmed = (email || '').trim()
  if (!EMAIL_SHAPE_RE.test(trimmed)) return false
  const tld = trimmed.slice(trimmed.lastIndexOf('.') + 1).toLowerCase()
  return !INVALID_TLDS.has(tld)
}
