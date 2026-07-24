import { normalizeEventName } from './eventMeta.js'
import { formatCarLabel, stripMakePrefix } from './carLabel.js'

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
// Returns { name, email, carYear, carMake, carModel } or null. carModel is
// always the bare model (make prefix stripped if the source combined it,
// e.g. applications.car_model) — callers pre-filling a separate Year/Make/
// Model form need the bare value, not a "make model" display string.
export async function findEventRegistrant(admin, eventId, eventName, email) {
  const [{ data: memberReg }, { data: app }] = await Promise.all([
    admin.from('event_registrations')
      .select('id, name, email, members(name, cars, car_year, car_make, car_model)')
      .eq('event_id', eventId)
      .eq('email', email)
      .in('stripe_payment_status', ['paid', 'free', 'authorized'])
      .maybeSingle(),
    admin.from('applications')
      .select('id, name, email, registrations, car_year, car_make, car_model')
      .eq('email', email)
      .maybeSingle(),
  ])

  if (memberReg) {
    const m = memberReg.members
    const primaryCar = m?.cars?.[0]
    const carYear = primaryCar?.year || m?.car_year || ''
    const carMake = primaryCar?.make || m?.car_make || ''
    const carModel = stripMakePrefix(carMake, primaryCar?.model || m?.car_model || '')
    return { name: m?.name || memberReg.name || '', email, carYear, carMake, carModel }
  }

  const matched = (app?.registrations || []).find(r => isSameEvent(r.event, eventName))
  if (app && matched) {
    // Per-event snapshot first — the flat columns reflect whichever event
    // this email registered for MOST RECENTLY, not necessarily this one, if
    // they've registered for more than one. Falls back to flat columns only
    // for registrations that predate the `details` snapshot.
    const d = matched.details
    const carMake = d?.car_make ?? app.car_make ?? ''
    return {
      name: app.name || '', email,
      carYear: d?.car_year ?? app.car_year ?? '',
      carMake,
      carModel: stripMakePrefix(carMake, (d?.car_model ?? app.car_model) || ''),
    }
  }

  return null
}

// Terminal negative payment states — an applications row in one of these
// never completed for whichever flow currently holds that status. Combined
// with the per-registration `paid` flag (lib/markRegistrationPaid.js) below,
// this is what keeps someone whose payment failed/was declined/refunded out
// of the registrants list instead of showing up as if they were confirmed.
const FAILED_PAYMENT_STATUSES = ['failed', 'rejected', 'refunded', 'disputed_lost']

// All registrants for an event across both paths, deduped by email —
// same merge the admin Events "Applications" tab already does client-side
// in EventsClient.jsx's toggleRegistrants, reused here for the admin
// check-in/awards status views. Includes the application id + live payment
// status so the admin Registrants view can capture/decline pending holds
// directly instead of needing a separate Applications/Payments screen.
export async function listEventRegistrants(admin, eventId, eventName) {
  const [{ data: memberRegs }, { data: apps }] = await Promise.all([
    admin.from('event_registrations')
      .select('name, email, lang, members(name)')
      .eq('event_id', eventId)
      .in('stripe_payment_status', ['paid', 'free', 'authorized']),
    admin.from('applications')
      .select('id, name, email, registrations, stripe_payment_status, stripe_payment_intent_id, stripe_amount_paid, phone, instagram, passengers, has_children, children_ages, source, more, dob, car_year, car_make, car_model, lang'),
  ])

  const byEmail = new Map()
  for (const r of memberRegs || []) {
    const email = (r.email || '').toLowerCase()
    if (!email) continue
    byEmail.set(email, { name: r.members?.name || r.name || '', email, paymentStatus: r.stripe_payment_status || null, applicationId: null, lang: r.lang || null })
  }
  for (const app of apps || []) {
    const email = (app.email || '').toLowerCase()
    if (!email || byEmail.has(email)) continue
    const matchedReg = (app.registrations || []).find(r => isSameEvent(r.event, eventName))
    if (!matchedReg) continue
    // Skip a registration that never actually paid for THIS event if the
    // application's current status is a terminal failure — but never skip
    // one already marked paid, since the shared stripe_payment_status column
    // can reflect a different flow entirely once this person registers for
    // anything else (see lib/markRegistrationPaid.js).
    if (!matchedReg.paid && FAILED_PAYMENT_STATUSES.includes(app.stripe_payment_status)) continue
    byEmail.set(email, {
      name: app.name || '', email,
      paymentStatus: matchedReg.paid ? 'paid' : (app.stripe_payment_status || null),
      applicationId: app.id,
      amountPaid: app.stripe_amount_paid || null,
      lang: app.lang || null,
      // Convoy group — set from the admin Registrants panel, lives on the
      // per-event registrations[] entry (road-trip registrants only; the
      // member-portal event_registrations path above has no group support).
      convoy_group: matchedReg.convoy_group ?? null,
      // What they filled in on the original registration form — distinct
      // from the check-in trip_details/waiver/lunch collected later.
      // Per-event snapshot (matchedReg.details) first, flat columns as
      // fallback only for registrations that predate that snapshot — the
      // flat columns reflect whichever event this email registered for MOST
      // RECENTLY, not necessarily this one.
      registration: {
        phone: matchedReg.details?.phone ?? app.phone ?? null,
        instagram: matchedReg.details?.instagram ?? app.instagram ?? null,
        passengers: matchedReg.details?.passengers ?? app.passengers ?? null,
        hasChildren: matchedReg.details?.has_children ?? app.has_children ?? null,
        childrenAges: matchedReg.details?.children_ages ?? app.children_ages ?? null,
        source: matchedReg.details?.source ?? app.source ?? null,
        message: matchedReg.details?.more ?? app.more ?? null,
        dob: matchedReg.details?.dob ?? app.dob ?? null,
        carYear: matchedReg.details?.car_year ?? app.car_year ?? null,
        carMake: matchedReg.details?.car_make ?? app.car_make ?? null,
        carModel: matchedReg.details?.car_model ?? app.car_model ?? null,
      },
    })
  }

  // Enrich with what actually happened at payment time — current member
  // status (proxy for "got the member rate") and any promo-code discount,
  // from the durable revenue ledger (lib/paymentLedger.js) rather than PI
  // metadata, which isn't queryable in bulk and can be gone if the PI is old.
  const emails = Array.from(byEmail.keys())
  if (emails.length) {
    const { data: routeLink } = await admin.from('upcoming_routes').select('slug').eq('event_id', eventId).maybeSingle()
    const [{ data: members }, { data: receipts }] = await Promise.all([
      admin.from('members').select('email').in('email', emails),
      routeLink?.slug
        ? admin.from('payment_receipts').select('email, discount_amount, stripe_payment_intent_id')
            .eq('payment_type', `road_trip_${routeLink.slug}`).in('email', emails).gt('discount_amount', 0)
        : Promise.resolve({ data: [] }),
    ])
    const memberEmails = new Set((members || []).map(m => (m.email || '').toLowerCase()))
    const piIds = (receipts || []).map(r => r.stripe_payment_intent_id)
    const { data: redemptions } = piIds.length
      ? await admin.from('promo_redemptions').select('stripe_payment_intent_id, code').in('stripe_payment_intent_id', piIds)
      : { data: [] }
    const codeByPi = new Map((redemptions || []).map(r => [r.stripe_payment_intent_id, r.code]))
    const discountByEmail = new Map((receipts || []).map(r => [(r.email || '').toLowerCase(), { amount: r.discount_amount, code: codeByPi.get(r.stripe_payment_intent_id) || null }]))

    for (const [email, reg] of byEmail) {
      reg.isMember = memberEmails.has(email)
      const d = discountByEmail.get(email)
      if (d) reg.discount = d
    }
  }

  return Array.from(byEmail.values())
}

// Batch resolver for the 'car_photo' check-in section: given an event's
// configured checkin_sections and a set of registrant emails, returns
// Map<email, effectiveSections[]> with 'car_photo' stripped out for anyone
// who shouldn't be asked — either they've already submitted one (for this
// event or any other; it's the same car) or they've attended a route with
// us before (attended === true on any OTHER registrations[] entry — a
// repeat participant we likely already have a photo from). Every caller
// that decides what to show/require/nag a registrant about for this section
// must go through this, not raw event.checkin_sections, or exempt people
// get asked/reminded forever since they'll never complete it.
export async function resolveCheckinSectionsBatch(admin, emails, checkinSections) {
  const sections = checkinSections || []
  const normEmails = [...new Set((emails || []).map(e => (e || '').toLowerCase().trim()).filter(Boolean))]
  if (!sections.includes('car_photo') || normEmails.length === 0) {
    return new Map(normEmails.map(e => [e, sections]))
  }
  const [{ data: priorPhotos }, { data: apps }] = await Promise.all([
    admin.from('event_checkins').select('email').in('email', normEmails).not('car_photo', 'is', null),
    admin.from('applications').select('email, registrations').in('email', normEmails),
  ])
  const alreadySent = new Set((priorPhotos || []).map(r => (r.email || '').toLowerCase()))
  const attendedBefore = new Set(
    (apps || [])
      .filter(a => (a.registrations || []).some(r => r.attended === true))
      .map(a => (a.email || '').toLowerCase())
  )
  const map = new Map()
  for (const email of normEmails) {
    const skip = alreadySent.has(email) || attendedBefore.has(email)
    map.set(email, skip ? sections.filter(s => s !== 'car_photo') : sections)
  }
  return map
}

// Single-registrant convenience wrapper.
export async function resolveCheckinSections(admin, email, checkinSections) {
  const normEmail = (email || '').toLowerCase().trim()
  const map = await resolveCheckinSectionsBatch(admin, [normEmail], checkinSections)
  return map.get(normEmail) || (checkinSections || [])
}

// Registrants enriched with their primary car + photo (for auto-derived
// Route Awards candidates, and the public itinerary car roster) — pulls from
// members.cars[0] when the registrant is a member (post per-car-photo
// support), falling back to the flat car_year/car_make/car_model columns on
// either members or applications. Photo priority: the event-specific photo
// they (or an admin) submitted via check-in (most accurate — it's the actual
// car showing up to THIS event) beats their general member-profile photo.
export async function listEventCandidates(admin, eventId, eventName) {
  const registrants = await listEventRegistrants(admin, eventId, eventName)
  if (registrants.length === 0) return []

  const emails = registrants.map(r => r.email)
  const [{ data: members }, { data: apps }, { data: checkins }] = await Promise.all([
    admin.from('members').select('email, cars, car_year, car_make, car_model, car_photo_url').in('email', emails),
    admin.from('applications').select('email, car_year, car_make, car_model').in('email', emails),
    admin.from('event_checkins').select('email, car_photo').eq('event_id', eventId).in('email', emails),
  ])
  const memberByEmail = new Map((members || []).map(m => [(m.email || '').toLowerCase(), m]))
  const appByEmail = new Map((apps || []).map(a => [(a.email || '').toLowerCase(), a]))
  const checkinByEmail = new Map((checkins || []).map(c => [(c.email || '').toLowerCase(), c]))

  return registrants.map(r => {
    const m = memberByEmail.get(r.email)
    const a = appByEmail.get(r.email)
    const primaryCar = m?.cars?.[0]
    // r.registration.car* is the per-event snapshot (already resolved by
    // listEventRegistrants above) — prefer it over a?.car_year, which is the
    // flat column and can reflect a DIFFERENT, more recent event's car.
    const year = primaryCar?.year || m?.car_year || r.registration?.carYear || a?.car_year || ''
    const make = primaryCar?.make || m?.car_make || r.registration?.carMake || a?.car_make || ''
    const model = primaryCar?.model || m?.car_model || r.registration?.carModel || a?.car_model || ''
    const photo = checkinByEmail.get(r.email)?.car_photo?.url || primaryCar?.photo_url || m?.car_photo_url || null
    return { name: r.name, email: r.email, car: formatCarLabel(year, make, model) || null, photo, group: r.convoy_group ?? null, paymentStatus: r.paymentStatus }
  })
}
