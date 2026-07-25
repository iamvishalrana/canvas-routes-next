import { isSameEvent } from './eventCheckinShared.js'

// Durable, per-event proof of payment. `applications.stripe_payment_status`
// is ONE column shared across every paid flow a member ever touches
// (membership, WTET, every road trip — see CLAUDE.md rule 22), so any
// register route's "already registered" check that reads it directly gives
// a false negative the moment the member starts a second flow (that flow's
// own 'pending' write clobbers the column). registrations[] is already
// per-event; this stamps `paid: true` onto the matching entry so duplicate
// checks can read that instead, immune to unrelated flows overwriting it.
export async function markRegistrationPaid(supabase, email, eventName) {
  const normalEmail = (email || '').toLowerCase().trim()
  if (!normalEmail || !eventName) return
  const { data: app } = await supabase.from('applications').select('registrations').eq('email', normalEmail).maybeSingle()
  if (!app?.registrations?.length) return
  let changed = false
  const updated = app.registrations.map(r => {
    if (!r.paid && isSameEvent(r.event, eventName)) { changed = true; return { ...r, paid: true } }
    return r
  })
  if (changed) await supabase.from('applications').update({ registrations: updated }).eq('email', normalEmail)
}

// Per-event submitted-data snapshot built from a PaymentIntent's metadata —
// shared by both webhook rescue paths (requires_capture for non-members,
// succeeded for members, since automatic-capture PIs skip requires_capture
// entirely) so a browser closing before the register route's own `details`
// write lands doesn't leave that event's car/phone/"tell us more"/etc. gone.
export function buildDetailsSnapshotFromMetadata(metadata, { includeMembershipFields = false } = {}) {
  return Object.fromEntries(Object.entries({
    car_year: metadata?.car_year, car_make: metadata?.car_make, car_model: metadata?.car_model,
    phone: metadata?.phone, dob: metadata?.dob, source: metadata?.source,
    passengers: metadata?.passengers, has_children: metadata?.has_children, children_ages: metadata?.children_ages,
    instagram: metadata?.instagram, more: metadata?.message,
    ...(includeMembershipFields ? { car_paint: metadata?.car_paint, referred_by: metadata?.referred_by } : {}),
  }).filter(([, v]) => v))
}

// Merges a details snapshot into the matching registrations[] entry only —
// spreads over any existing details rather than replacing, and no-ops if
// there's nothing to merge or no matching entry yet (mirrors markRegistrationPaid's
// read-map-write shape above).
export async function mergeRegistrationDetails(supabase, email, eventName, details) {
  const normalEmail = (email || '').toLowerCase().trim()
  if (!normalEmail || !eventName || !details || Object.keys(details).length === 0) return
  const { data: app } = await supabase.from('applications').select('registrations').eq('email', normalEmail).maybeSingle()
  if (!app?.registrations?.length) return
  let changed = false
  const updated = app.registrations.map(r => {
    if (isSameEvent(r.event, eventName)) { changed = true; return { ...r, details: { ...r.details, ...details } } }
    return r
  })
  if (changed) await supabase.from('applications').update({ registrations: updated }).eq('email', normalEmail)
}
