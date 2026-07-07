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

// All registrants for an event across both paths, deduped by email —
// same merge the admin Events "Applications" tab already does client-side
// in EventsClient.jsx's toggleRegistrants, reused here for the admin
// check-in/awards status views.
export async function listEventRegistrants(admin, eventId, eventName) {
  const [{ data: memberRegs }, { data: apps }] = await Promise.all([
    admin.from('event_registrations')
      .select('name, email, members(name)')
      .eq('event_id', eventId)
      .in('stripe_payment_status', ['paid', 'free', 'authorized']),
    admin.from('applications')
      .select('name, email, registrations'),
  ])

  const byEmail = new Map()
  for (const r of memberRegs || []) {
    const email = (r.email || '').toLowerCase()
    if (!email) continue
    byEmail.set(email, { name: r.members?.name || r.name || '', email })
  }
  for (const app of apps || []) {
    const email = (app.email || '').toLowerCase()
    if (!email || byEmail.has(email)) continue
    const matched = (app.registrations || []).some(r => isSameEvent(r.event, eventName))
    if (matched) byEmail.set(email, { name: app.name || '', email })
  }

  return Array.from(byEmail.values())
}
