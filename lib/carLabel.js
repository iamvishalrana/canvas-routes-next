// Registration flows (HTM/WTET/membership) store car_model as the make
// already prefixed onto the model (e.g. "Lamborghini Aventador S"), while
// car_make is also stored separately ("Lamborghini") — so a naive
// [year, make, model].join(' ') doubles the make. Members who edit their
// own car in the portal store model alone (no prefix), so this can't be
// fixed by always dropping make either. Detect the actual duplication
// instead — safe no-op when there isn't one.
export function formatCarLabel(year, make, model) {
  const y = (year ?? '').toString().trim()
  const mk = (make || '').trim()
  const md = (model || '').trim()
  const modelHasMake = mk && md && md.toLowerCase().startsWith(mk.toLowerCase())
  return [y, modelHasMake ? null : mk, md].filter(Boolean).join(' ')
}

// Inverse of the above — for splitting a combined car_model back into a bare
// model when it needs to populate a separate "Model" field (e.g. pre-filling
// the waiver form's Year/Make/Model inputs) rather than a single display
// string. Safe no-op if model doesn't actually start with make.
export function stripMakePrefix(make, model) {
  const mk = (make || '').trim()
  const md = (model || '').trim()
  if (mk && md.toLowerCase().startsWith(mk.toLowerCase())) {
    return md.slice(mk.length).trim()
  }
  return md
}
