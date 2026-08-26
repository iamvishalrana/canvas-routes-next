import { after } from 'next/server'
import { checkRateLimit, getClientIp } from '../../../../../../lib/rateLimit.js'
import { deviceType } from '../../../../../../lib/deviceType'
import { captureException } from '../../../../../../lib/sentry.js'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { listEventRegistrants } from '../../../../../../lib/eventCheckinShared.js'
import { buildEventConfirmHtml } from '../../../../../../lib/eventConfirmEmail.js'
import { buildAdminNotifyHtml } from '../../../../../../lib/adminEmail.js'

const VALID_SOURCES = ['Instagram', 'Facebook', 'Friend / Word of mouth', 'Google', 'Other']

// Every value below comes straight from an unauthenticated public submitter —
// must be escaped before landing in the admin notify email's raw HTML rows.
// Mirrors the h() helper in app/api/ccd-register/route.js (the one-off this
// route generalizes), which already does this for the same field set.
function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// Generic no-auth registration route for any 'Meet'-type event with
// public_registration_enabled — the reusable path for low-friction casual
// meets (Cars & Coffee, etc.), so future meets need only a new `events` row
// + this route, not a bespoke page/route clone like the paid road-trip flows
// (WTET/Calabogie/CMT) require. Whether the event is *listed* anywhere
// (visible_to_public) is a separate, independent toggle — an event can be
// registration-open here while unlisted, reachable only via a direct shared
// link (matches the "invite-only" precedent on app/cars-coffee-dad-jokes).
// Mirrors app/api/ccd-register (the one-off it generalizes) and
// app/api/member/events/[id]/free-register (the member-portal equivalent) —
// writes to applications.registrations[] instead of event_registrations
// since that table's member_id column is NOT NULL and can't hold a
// non-member row.
export async function POST(request, { params }) {
  const ip = getClientIp(request)
  if (ip && await checkRateLimit(ip, 10, 60)) {
    return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const { id: eventId } = await params
  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { name, email, year, carMake, carModel, phone, instagram, more, source, isMember, _hp } = body
  if (_hp) return Response.json({ success: true })

  if (!name?.trim() || name.trim().length < 2)
    return Response.json({ error: 'Full name is required.' }, { status: 400 })
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return Response.json({ error: 'A valid email address is required.' }, { status: 400 })
  if (!year?.trim()) return Response.json({ error: 'Car year is required.' }, { status: 400 })
  if (!carMake?.trim()) return Response.json({ error: 'Car make is required.' }, { status: 400 })
  if (!carModel?.trim()) return Response.json({ error: 'Car model is required.' }, { status: 400 })
  if (name.length > 100) return Response.json({ error: 'Name too long.' }, { status: 400 })
  if (email.length > 254) return Response.json({ error: 'Email too long.' }, { status: 400 })
  if (carModel.length > 100) return Response.json({ error: 'Car model too long.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: ev } = await admin.from('events')
    .select('id, name, date, date_display, location, public_registration_enabled, registration_opens_at, registration_closes_at, capacity')
    .eq('id', eventId).maybeSingle()
  if (!ev) return Response.json({ error: 'Event not found.' }, { status: 404 })
  if (ev.public_registration_enabled === false) {
    return Response.json({ error: 'Registration is not open for this event.' }, { status: 400 })
  }
  const now = new Date()
  if (ev.registration_opens_at && now < new Date(ev.registration_opens_at)) {
    return Response.json({ error: 'Registration is not open yet.' }, { status: 400 })
  }
  if (ev.registration_closes_at && now > new Date(ev.registration_closes_at)) {
    return Response.json({ error: 'Registration has closed for this event.' }, { status: 400 })
  }

  const normalEmail = email.toLowerCase().trim()

  // Verify member status server-side — never trust isMember from the client
  // body alone. Members skip the "how did you hear about us" requirement.
  let verifiedMember = false
  if (isMember === true) {
    try {
      const { data: member } = await admin.from('members').select('id').eq('email', normalEmail).maybeSingle()
      verifiedMember = !!member
    } catch { /* fall through — treat as non-member */ }
  }
  if (!verifiedMember && (!source || !VALID_SOURCES.includes(source)))
    return Response.json({ error: 'Please tell us how you heard about us.' }, { status: 400 })

  if (ev.capacity) {
    try {
      const registrants = await listEventRegistrants(admin, ev.id, ev.name)
      // Exclude the submitter's own existing registration — otherwise
      // someone who already has a confirmed spot gets rejected as "full"
      // when they revisit the link to correct their details after the
      // event fills up.
      const otherRegistrants = registrants.filter(r => r.email !== normalEmail)
      if (otherRegistrants.length >= ev.capacity) {
        return Response.json({ error: 'This event is full. Contact us to be added to the waitlist.' }, { status: 400 })
      }
    } catch (e) {
      captureException(e, { context: 'public-event-register-capacity', eventId })
    }
  }

  const fullCarModel = [carMake, carModel].filter(Boolean).join(' ')
  const firstName = name.trim().split(' ')[0]

  let appId = null
  try {
    const { data: existing } = await admin.from('applications')
      .select('id, registrations').eq('email', normalEmail).maybeSingle()

    const existingReg = (existing?.registrations || []).find(r => r.event === ev.name)
    const newReg = {
      event: ev.name,
      registered_at: existingReg?.registered_at || new Date().toISOString(),
      attended: existingReg?.attended ?? null,
      details: {
        car_year: year?.trim() || null, car_make: carMake?.trim() || null, car_model: fullCarModel || null,
        phone: phone || null, instagram: instagram ? instagram.trim().replace(/^@+/, '') : null,
        more: more || null, source: source || null,
      },
    }
    const prevRegs = (existing?.registrations || []).filter(r => r.event !== ev.name)
    const registrations = [...prevRegs, newReg]

    const { data: appData, error: upsertErr } = await admin.from('applications').upsert({
      device_type: deviceType(request),
      email: normalEmail,
      name: name.trim(),
      car_year: year?.trim() || null,
      car_make: carMake?.trim() || null,
      car_model: fullCarModel || null,
      phone: phone || null,
      instagram: instagram ? instagram.trim().replace(/^@+/, '') : null,
      more: more || null,
      source: source || null,
      registrations,
      ...(existing ? { reregistered_at: new Date().toISOString() } : {}),
    }, { onConflict: 'email' }).select('id').single()

    if (upsertErr) {
      captureException(upsertErr, { context: 'public-event-register-db-upsert', email: normalEmail, eventId })
      return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
    appId = appData?.id || null
    if (appId) {
      const { error: contactErr } = await admin.from('contacts').upsert(
        { application_id: appId }, { onConflict: 'application_id', ignoreDuplicates: true }
      )
      if (contactErr) captureException(contactErr, { context: 'public-event-register-contacts', email: normalEmail })
    }
  } catch (e) {
    captureException(e, { context: 'public-event-register-db', email: normalEmail, eventId })
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }

  if (process.env.RESEND_API_KEY) {
    const dateDisplay = ev.date_display || ev.date || null
    after(() => Promise.allSettled([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Canvas Routes <jerry@canvasroutes.com>',
          to: normalEmail,
          reply_to: 'jerry@canvasroutes.com',
          subject: `You're registered — ${ev.name}`,
          html: buildEventConfirmHtml({ firstName: h(firstName), eventName: ev.name, dateDisplay, location: ev.location || null, isFree: true, amountPaid: 0, eventId: ev.id, date: ev.date || null }),
          text: `Hey ${firstName},\n\nYou're registered for ${ev.name}${dateDisplay ? ` on ${dateDisplay}` : ''}${ev.location ? ` at ${ev.location}` : ''}.\n\nSee you there,\nJerry\nCanvas Routes`,
        }),
      }).catch(err => captureException(err, { context: 'public-event-register-confirm-email', eventId })),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Canvas Routes <info@canvasroutes.com>',
          to: 'info@canvasroutes.com',
          subject: `Event Registration — ${ev.name} — ${name.trim()}`,
          html: buildAdminNotifyHtml('New public event registration', [
            ['Event', `<strong>${h(ev.name)}</strong>`],
            ['Name', `<strong>${h(name.trim())}</strong>`],
            ['Email', `<a href="mailto:${h(normalEmail)}" style="color:#1a1a1a;">${h(normalEmail)}</a>`],
            ['Car', h(fullCarModel) || '—'],
            ['Phone', h(phone) || '—'],
            ['Instagram', instagram ? `@${h(instagram.replace(/^@+/, ''))}` : '—'],
            ['About', h(more) || '—'],
            ['Source', verifiedMember ? 'Canvas Routes Member' : (h(source) || '—')],
          ]),
        }),
      }).catch(err => captureException(err, { context: 'public-event-register-admin-email', eventId })),
    ]))
  }

  return Response.json({ success: true })
}
