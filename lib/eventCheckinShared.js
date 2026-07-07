import { normalizeEventName } from './eventMeta.js'

// Strips the "— Date" suffix admin event names typically carry, so a
// registrations[] entry written against an older/differently-worded event
// name can still match. Mirrors the `evBase` helper already used in
// app/admin/events/EventsClient.jsx for the same reason.
export function baseEventName(name) {
  return normalizeEventName(name || '').split(/\s[—–]\s/)[0].trim()
}

export function isSameEvent(nameA, nameB) {
  const a = normalizeEventName(nameA || ''), b = normalizeEventName(nameB || '')
  if (!a || !b) return false
  return a === b || baseEventName(a) === baseEventName(b)
}

// Resolve whether `email` is a valid registrant for `eventId`/`eventName`.
// Checks both registration paths the admin panel already merges:
//   1. event_registrations — member-portal-paid signups (event_id-scoped)
//   2. applications.registrations[] — public-form/admin-manual/Stripe signups
//      (name-matched, since that array has no event_id column)
// Returns { name, email } or null.
export async function findEventRegistrant(admin, eventId, eventName, email) {
  const [{ data: memberReg }, { data: app }] = await Promise.all([
    admin.from('event_registrations')
      .select('id, name, email, members(name)')
      .eq('event_id', eventId)
      .eq('email', email)
      .in('stripe_payment_status', ['paid', 'free', 'authorized'])
      .maybeSingle(),
    admin.from('applications')
      .select('id, name, email, registrations')
      .eq('email', email)
      .maybeSingle(),
  ])

  if (memberReg) {
    return { name: memberReg.members?.name || memberReg.name || '', email }
  }

  const matched = (app?.registrations || []).some(r => isSameEvent(r.event, eventName))
  if (app && matched) {
    return { name: app.name || '', email }
  }

  return null
}
