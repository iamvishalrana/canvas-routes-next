import { isSameEvent } from './eventCheckinShared.js'

// Jerry hosts/leads every Canvas Routes event in person — previously his
// name/photo were hardcoded directly into individual itinerary pages (e.g.
// HTM's MANUAL_PARTICIPANTS array) with nothing behind them: he didn't show
// up as a real registrant anywhere check-in, awards, or the admin registrant
// list actually read from. This makes him a real, permanent entry in
// applications.registrations[] instead, going through the exact same path
// every other registrant does (see lib/eventCheckinShared.js), so he
// automatically appears everywhere that reads from it.
export const JERRY_EMAIL = 'jerry@canvasroutes.com'
export const JERRY_NAME = 'Jerry'

// Idempotent — safe to call every time an event is created/re-saved. Adds a
// paid+attended registrations[] entry for this event name if one doesn't
// already exist. The `permanent: true` flag is what the registrant-removal
// routes check to refuse taking him off an event's list.
export async function ensureJerryRegistered(admin, eventName) {
  const name = (eventName || '').trim()
  if (!name) return

  const { data: existing } = await admin.from('applications')
    .select('id, registrations').eq('email', JERRY_EMAIL).maybeSingle()

  const already = (existing?.registrations || []).some(r => isSameEvent(r.event, name))
  if (already) return

  const registrations = [
    ...(existing?.registrations || []),
    { event: name, registered_at: new Date().toISOString(), attended: true, paid: true, permanent: true },
  ]

  await admin.from('applications').upsert({
    email: JERRY_EMAIL,
    name: JERRY_NAME,
    registrations,
    ...(existing ? {} : { stripe_payment_status: 'paid', stripe_paid_at: new Date().toISOString() }),
  }, { onConflict: 'email' })
}

// True if this registrant is Jerry's permanent entry and shouldn't be
// removable from an event's registrant list. Checked by email as the primary
// signal (works even for entries written before the `permanent` flag
// existed); the flag itself is the belt-and-suspenders check.
export function isPermanentRegistrant(email, registrationEntry) {
  if ((email || '').toLowerCase().trim() === JERRY_EMAIL) return true
  return !!registrationEntry?.permanent
}
