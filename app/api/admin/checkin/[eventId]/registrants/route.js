import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { normalizeEmail } from '../../../../../../lib/normalizeEmail'
import { isSameEvent } from '../../../../../../lib/eventCheckinShared'
import { isPermanentRegistrant } from '../../../../../../lib/jerryRegistrant.js'
import { captureException } from '../../../../../../lib/sentry.js'

// Manually add someone to an event's registrant list — for walk-ins, comps,
// or anyone who registered outside the normal Stripe flow. Writes to the
// same applications.registrations[] array every road-trip flow uses, marked
// paid so they show up as confirmed (not filtered out as a failed payment)
// and are immediately visible to check-in / awards.
export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { eventId } = await params

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const email = normalizeEmail(body?.email)
  const name = (body?.name || '').trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (!name) return Response.json({ error: 'Please enter a name.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: event, error: eventErr } = await admin.from('events').select('id, name').eq('id', eventId).maybeSingle()
  if (eventErr || !event) return Response.json({ error: 'Event not found' }, { status: 404 })

  const { data: existing } = await admin.from('applications').select('id, registrations').eq('email', email).maybeSingle()
  const already = (existing?.registrations || []).find(r => isSameEvent(r.event, event.name))
  if (already?.paid) return Response.json({ error: 'This email is already registered for this event.' }, { status: 400 })

  const registrations = [
    ...(existing?.registrations || []).filter(r => !isSameEvent(r.event, event.name)),
    { event: event.name, registered_at: new Date().toISOString(), attended: null, paid: true },
  ]

  const { error: upsertErr } = await admin.from('applications').upsert({
    email,
    name,
    registrations,
    ...(existing ? {} : { stripe_payment_status: 'paid', stripe_paid_at: new Date().toISOString() }),
  }, { onConflict: 'email' })

  if (upsertErr) {
    captureException(upsertErr, { context: 'admin-add-registrant', eventId, email })
    return Response.json({ error: 'Failed to add registrant.' }, { status: 500 })
  }

  return Response.json({ success: true })
}

// Sets (or clears) the convoy group and/or the car year/make/model on a
// road-trip registrant — both live inside their matched registrations[]
// entry, same as `attended`/`paid`. Member-portal (event_registrations)
// registrants have no group/car-edit support; this is a no-op for them
// since they never have a matching applications row here.
//
// Car edits write into registrations[].details — the per-EVENT snapshot —
// not the flat applications.car_year/car_make/car_model columns, so
// swapping the car for this one event (e.g. bringing a different car from
// the garage) doesn't change what shows for the same person's other events
// or their general profile. See lib/eventCheckinShared.js, which already
// prefers details.car_* over the flat columns for exactly this reason.
export async function PATCH(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { eventId } = await params

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const email = normalizeEmail(body?.email)
  if (!email) return Response.json({ error: 'Missing email.' }, { status: 400 })

  const hasGroup = Object.prototype.hasOwnProperty.call(body, 'group')
  const hasCar = ['car_year', 'car_make', 'car_model'].some(k => Object.prototype.hasOwnProperty.call(body, k))
  if (!hasGroup && !hasCar) return Response.json({ error: 'Nothing to update.' }, { status: 400 })

  let group = null
  if (hasGroup) {
    group = body.group === null || body.group === '' ? null : parseInt(body.group, 10)
    if (group !== null && !Number.isFinite(group)) return Response.json({ error: 'Invalid group.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: event, error: eventErr } = await admin.from('events').select('id, name').eq('id', eventId).maybeSingle()
  if (eventErr || !event) return Response.json({ error: 'Event not found' }, { status: 404 })

  const { data: app } = await admin.from('applications').select('id, registrations').eq('email', email).maybeSingle()
  const matched = (app?.registrations || []).find(r => isSameEvent(r.event, event.name))
  if (!app || !matched) return Response.json({ error: 'No registration found for this email.' }, { status: 404 })

  const registrations = (app.registrations || []).map(r => {
    if (!isSameEvent(r.event, event.name)) return r
    const next = { ...r }
    if (hasGroup) next.convoy_group = group
    if (hasCar) {
      const details = { ...(r.details || {}) }
      if ('car_year' in body)  details.car_year  = (body.car_year  || '').toString().trim() || null
      if ('car_make' in body)  details.car_make  = (body.car_make  || '').toString().trim() || null
      if ('car_model' in body) details.car_model = (body.car_model || '').toString().trim() || null
      next.details = details
    }
    return next
  })
  const { error: updErr } = await admin.from('applications').update({ registrations }).eq('id', app.id)
  if (updErr) {
    captureException(updErr, { context: 'admin-update-registrant', eventId, email })
    return Response.json({ error: 'Failed to save.' }, { status: 500 })
  }
  return Response.json({ success: true })
}

// Removes a registrant from this event only — strips their registrations[]
// entry for this event (or their event_registrations row, for the
// member-portal generic paid-event path). Refuses if a payment is still an
// active Stripe hold so admins don't orphan a live authorization — decline
// that from the Registrants list first.
export async function DELETE(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { eventId } = await params

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const email = normalizeEmail(body?.email)
  if (!email) return Response.json({ error: 'Missing email.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: event, error: eventErr } = await admin.from('events').select('id, name').eq('id', eventId).maybeSingle()
  if (eventErr || !event) return Response.json({ error: 'Event not found' }, { status: 404 })

  const { data: memberReg } = await admin.from('event_registrations')
    .select('id, stripe_payment_status').eq('event_id', eventId).eq('email', email).maybeSingle()
  if (memberReg) {
    if (memberReg.stripe_payment_status === 'pending') {
      return Response.json({ error: 'This registration has a pending payment — resolve it before removing.' }, { status: 400 })
    }
    const { error: delErr } = await admin.from('event_registrations').delete().eq('id', memberReg.id)
    if (delErr) {
      captureException(delErr, { context: 'admin-remove-registrant-member', eventId, email })
      return Response.json({ error: 'Failed to remove registrant.' }, { status: 500 })
    }
    return Response.json({ success: true })
  }

  const { data: app } = await admin.from('applications').select('id, registrations, stripe_payment_status').eq('email', email).maybeSingle()
  const matched = (app?.registrations || []).find(r => isSameEvent(r.event, event.name))
  if (!app || !matched) return Response.json({ error: 'No registration found for this email.' }, { status: 404 })
  if (isPermanentRegistrant(email, matched)) {
    return Response.json({ error: "Jerry's registration is permanent and can't be removed from an event." }, { status: 403 })
  }
  if (!matched.paid && app.stripe_payment_status === 'authorized') {
    return Response.json({ error: 'This person has a pending payment hold — decline it from the Registrants list before removing.' }, { status: 400 })
  }

  const registrations = (app.registrations || []).filter(r => !isSameEvent(r.event, event.name))
  const { error: updErr } = await admin.from('applications').update({ registrations }).eq('id', app.id)
  if (updErr) {
    captureException(updErr, { context: 'admin-remove-registrant-app', eventId, email })
    return Response.json({ error: 'Failed to remove registrant.' }, { status: 500 })
  }
  return Response.json({ success: true })
}
