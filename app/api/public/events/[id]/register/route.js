import { after } from 'next/server'
import { checkRateLimit, getClientIp } from '../../../../../../lib/rateLimit.js'
import { deviceType } from '../../../../../../lib/deviceType'
import { captureException } from '../../../../../../lib/sentry.js'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { createClient } from '../../../../../../lib/supabase/server'
import { listEventRegistrants, isSameEvent } from '../../../../../../lib/eventCheckinShared.js'
import { buildAdminNotifyHtml } from '../../../../../../lib/adminEmail.js'
import { buildPendingReviewHtml, buildAcceptedHtml } from '../../../../../../lib/eventReviewEmails.js'
import { getEventTimes } from '../../../../../../lib/eventMeta.js'
import { calendarButtonsHtml } from '../../../../../../lib/eventCalendarLinks.js'

const VALID_SOURCES = ['Instagram', 'Facebook', 'Friend / Word of mouth', 'Google', 'Other']

// Every value below comes straight from an unauthenticated public submitter —
// must be escaped before landing in raw HTML (the admin notify email's rows,
// and this registrant's own confirmation-received email). Mirrors the h()
// helper in app/api/ccd-register/route.js (the one-off this route
// generalizes), which already does this for the same field set.
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

  const { name, email, year, carMake, carModel, phone, instagram, more, source, _hp } = body
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
  if (phone && phone.length > 30) return Response.json({ error: 'Phone number too long.' }, { status: 400 })
  if (instagram && instagram.length > 50) return Response.json({ error: 'Instagram handle too long.' }, { status: 400 })
  if (more && more.length > 300) return Response.json({ error: 'Message too long.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: ev } = await admin.from('events')
    .select('id, name, date, date_display, location, photo_url, public_registration_enabled, registration_opens_at, registration_closes_at, capacity')
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

  // Verify member status entirely server-side, from the request's own
  // session cookie — never from a client-supplied isMember flag. This route
  // has no auth requirement (anyone can register), so a client-supplied
  // boolean is trivially spoofable: an unauthenticated caller could once
  // claim isMember:true with any real member's email in the body and get
  // instantly accepted (bypassing review and capacity) under that person's
  // identity, plus overwrite their applications row with arbitrary data.
  // Requiring the AUTHENTICATED session's own email to match the submitted
  // email closes that — only someone actually logged in as that member can
  // ever get the member fast-path, regardless of what the request body says.
  let verifiedMember = false
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email && user.email.toLowerCase().trim() === normalEmail) {
      const { data: member } = await admin.from('members').select('id').eq('id', user.id).maybeSingle()
      verifiedMember = !!member
    }
  } catch { /* fall through — treat as non-member */ }
  if (!verifiedMember && (!source || !VALID_SOURCES.includes(source)))
    return Response.json({ error: 'Please tell us how you heard about us.' }, { status: 400 })

  // Verified members always get in — capacity only gates public/non-member
  // submissions, which is also why it must run after verifiedMember is known.
  if (ev.capacity && !verifiedMember) {
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

    const existingReg = (existing?.registrations || []).find(r => isSameEvent(r.event, ev.name))
    const newReg = {
      event: ev.name,
      registered_at: existingReg?.registered_at || new Date().toISOString(),
      attended: existingReg?.attended ?? null,
      // Public submissions are admin-reviewed (Accept/Decline in the event's
      // Registrants panel) — preserve an already-decided outcome across a
      // re-submission (e.g. fixing a typo) instead of bumping it back to
      // pending. Verified members skip review entirely and are always
      // accepted, regardless of any prior state or event capacity.
      review_status: verifiedMember ? 'accepted' : (existingReg?.review_status || 'pending'),
      details: {
        car_year: year?.trim() || null, car_make: carMake?.trim() || null, car_model: fullCarModel || null,
        phone: phone || null, instagram: instagram ? instagram.trim().replace(/^@+/, '') : null,
        more: more || null, source: source || null,
      },
    }
    const prevRegs = (existing?.registrations || []).filter(r => !isSameEvent(r.event, ev.name))
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
    const timeDisplay = getEventTimes(ev.id)?.display || null
    // Accepted (member) email gets the "add to calendar" buttons; the pending
    // (non-member) email doesn't — the spot isn't confirmed yet, so a calendar
    // hold would be premature. They get it in the Accepted email after review.
    const calendarHtml = calendarButtonsHtml({ eventId: ev.id, eventName: ev.name, date: ev.date, location: ev.location || null })
    after(() => Promise.allSettled([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Canvas Routes <jerry@canvasroutes.com>',
          to: normalEmail,
          reply_to: 'jerry@canvasroutes.com',
          subject: verifiedMember ? `You're confirmed — ${ev.name}` : `Registration received — ${ev.name}`,
          html: verifiedMember
            ? buildAcceptedHtml({ firstName: h(firstName), eventName: h(ev.name), dateDisplay, timeDisplay, location: ev.location || null, photoUrl: ev.photo_url || null, calendarHtml })
            : buildPendingReviewHtml({ firstName: h(firstName), eventName: h(ev.name), dateDisplay, timeDisplay, location: ev.location || null, photoUrl: ev.photo_url || null }),
          text: verifiedMember
            ? `Hey ${firstName},\n\nYour spot at ${ev.name}${dateDisplay ? ` on ${dateDisplay}` : ''}${ev.location ? ` at ${ev.location}` : ''} is confirmed. See you there.\n\nKnow any car friends who'd love this too? Tell them to register and mention your name — a referral from someone we already know is an easy yes.\n\nJerry\nCanvas Routes`
            : `Hey ${firstName},\n\nWe've received your registration for ${ev.name}${dateDisplay ? ` on ${dateDisplay}` : ''}${ev.location ? ` at ${ev.location}` : ''}. Every registration is personally reviewed — we'll follow up by email with your confirmation before the event.\n\nJerry\nCanvas Routes`,
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
            ['Car year', h(year?.trim()) || '—'],
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

  return Response.json({ success: true, confirmed: verifiedMember })
}
