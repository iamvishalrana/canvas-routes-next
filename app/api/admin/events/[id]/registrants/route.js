import { after } from 'next/server'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { captureException } from '../../../../../../lib/sentry'
import { buildInviteHtml } from '../../../../../../lib/inviteEmail'
import { normalizeEventName, attendanceKey } from '../../../../../../lib/eventMeta.js'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'

export async function GET(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('event_registrations')
    .select('id, email, name, stripe_payment_status, amount_paid, registered_at')
    .eq('event_id', id)
    .in('stripe_payment_status', ['paid', 'free', 'authorized'])
    .order('registered_at', { ascending: true })
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  return Response.json(data || [])
}

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const { name, email, payment } = await request.json().catch(() => ({}))
  if (!name?.trim() || !email?.trim() || !email.includes('@')) {
    return Response.json({ error: 'Name and valid email are required.' }, { status: 400 })
  }
  const VALID_PAYMENTS = ['none', 'cash', 'etransfer', 'comped']
  const paymentMethod = VALID_PAYMENTS.includes(payment) ? payment : 'none'
  const isPaid = paymentMethod === 'cash' || paymentMethod === 'etransfer'
  const isFree = paymentMethod === 'comped'

  const admin = createAdminClient()

  const { data: ev, error: evErr } = await admin
    .from('events')
    .select('name, type, date, location')
    .eq('id', id)
    .maybeSingle()
  if (evErr) return Response.json({ error: evErr.message }, { status: 500 })
  if (!ev) return Response.json({ error: 'Event not found.' }, { status: 404 })

  const normalEmail = email.toLowerCase().trim()
  const trimmedName = name.trim()

  // Upsert into applications — add this event to their registrations array.
  // stripe_payment_type must be selected: the hasRealStripePayment guard below
  // reads it, and without it a manual re-add overwrites a real Stripe payment
  // with external_cash/comped status.
  const { data: existing } = await admin.from('applications')
    .select('id, registrations, source, stripe_payment_type, notes')
    .eq('email', normalEmail)
    .maybeSingle()

  const newReg = { event: ev.name, registered_at: new Date().toISOString(), attended: null, source: 'admin_manual', ...(paymentMethod !== 'none' ? { payment_method: paymentMethod } : {}) }
  // Dedupe by normalized name — renamed/aliased events must not produce duplicates
  const prevRegs = (existing?.registrations || []).filter(r => normalizeEventName(r.event) !== normalizeEventName(ev.name))

  // Only write payment fields when there's no existing real Stripe payment to preserve
  const hasRealStripePayment = existing?.stripe_payment_type && !existing.stripe_payment_type.startsWith('external_')
  const { data: appData, error: appErr } = await admin.from('applications').upsert({
    email: normalEmail,
    name: trimmedName,
    registrations: [...prevRegs, newReg],
    source: existing?.source || 'Manual — Admin',
    ...(!hasRealStripePayment && isPaid ? { stripe_payment_status: 'paid', stripe_payment_type: `external_${paymentMethod}` } : {}),
    ...(!hasRealStripePayment && isFree ? { stripe_payment_status: 'free' } : {}),
    ...(existing ? { reregistered_at: new Date().toISOString() } : {}),
  }, { onConflict: 'email' }).select('id').maybeSingle()

  if (appErr) return Response.json({ error: appErr.message }, { status: 500 })

  const appId = appData?.id ?? (await admin.from('applications').select('id').eq('email', normalEmail).maybeSingle()).data?.id

  if (!appId) {
    captureException(new Error('registrant-add: could not resolve appId after upsert'), { context: 'registrant-add-no-appid', email: normalEmail, eventId: id })
    return Response.json({ success: true })
  }

  if (appId) {
    // ignoreDuplicates: only newly inserted contact rows get the seeded note;
    // existing contacts keep their own (already-synced) notes
    const { error: contactErr } = await admin.from('contacts').upsert(
      { application_id: appId, notes: existing?.notes ?? null },
      { onConflict: 'application_id', ignoreDuplicates: true }
    )
    if (contactErr) captureException(new Error(contactErr.message), { context: 'registrant-add-contact-upsert', appId, eventId: id })
  }

  // If this email belongs to a member, mirror the registration into
  // event_registrations — the member portal checks that table by member_id,
  // and without this row the member is shown as unregistered and can pay again.
  const { data: memberRow } = await admin.from('members').select('id').eq('email', normalEmail).maybeSingle()
  if (memberRow?.id) {
    const { error: evRegErr } = await admin.from('event_registrations').upsert({
      event_id: id,
      member_id: memberRow.id,
      email: normalEmail,
      name: trimmedName,
      stripe_payment_status: isPaid ? 'paid' : 'free',
      amount_paid: null,
    }, { onConflict: 'event_id,member_id' })
    if (evRegErr) captureException(new Error(evRegErr.message), { context: 'registrant-add-event-registrations-mirror', appId, eventId: id })
  }

  // Auto-send the Confirm My Spot invite email
  if (appId && process.env.RESEND_API_KEY) {
    const now = new Date()
    let expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    if (ev.date) {
      const cutoff = new Date(new Date(ev.date).getTime() - 48 * 60 * 60 * 1000)
      if (cutoff < expiresAt) expiresAt = cutoff
    }
    if (expiresAt <= now) expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const { data: existingToken } = await admin
      .from('rsvp_tokens')
      .select('confirmed_at, answers')
      .eq('application_id', appId)
      .eq('event_name', ev.name)
      .maybeSingle()

    const { data: tokenRow, error: tokenErr } = await admin
      .from('rsvp_tokens')
      .upsert({
        application_id: appId,
        event_name: ev.name,
        expires_at: expiresAt.toISOString(),
        confirmed_at: existingToken?.confirmed_at ?? null,
        answers: existingToken?.answers ?? null,
        declined_at: null,
      }, { onConflict: 'application_id,event_name', ignoreDuplicates: false })
      .select('token')
      .single()

    if (tokenErr || !tokenRow) {
      captureException(tokenErr, { context: 'registrant-auto-invite-token', appId, eventId: id })
    } else if (!existingToken) {
      const firstName = trimmedName.split(' ')[0]
      const rsvpUrl = `${SITE}/rsvp/${tokenRow.token}`
      const isRoadTrip = ev.type === 'Road Trip' || ev.type === 'Route'
      const textSignoff = isRoadTrip ? 'See you on the road' : 'See you there'

      after(() =>
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Canvas Routes <jerry@canvasroutes.com>',
            to: normalEmail,
            reply_to: 'jerry@canvasroutes.com',
            subject: `You're confirmed — ${ev.name}`,
            html: buildInviteHtml(firstName, ev.name, ev.date, ev.location, rsvpUrl, expiresAt.toISOString(), isRoadTrip),
            text: `Hey ${firstName},\n\nYou're confirmed for ${ev.name}. Check in here:\n${rsvpUrl}\n\nThis link expires ${expiresAt.toLocaleDateString('en-CA', { month: 'long', day: 'numeric' })}.\n\n${textSignoff},\nJerry`,
          }),
        })
        .then(res => {
          if (!res.ok) res.json().catch(() => ({})).then(d =>
            captureException(new Error(`Resend HTTP ${res.status}: ${d.message || ''}`), { context: 'registrant-auto-invite-email', email: normalEmail, eventId: id })
          )
        })
        .catch(err => captureException(err, { context: 'registrant-auto-invite-email', email: normalEmail, eventId: id }))
      )
    }
  }

  return Response.json({ success: true })
}

export async function DELETE(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id: eventId } = await params
  const { email } = await request.json().catch(() => ({}))
  if (!email?.trim()) return Response.json({ error: 'Email required.' }, { status: 400 })

  const admin = createAdminClient()
  const normalEmail = email.toLowerCase().trim()

  // Remove from event_registrations — try by email first, fall back to member_id via members table
  const { error: regErr, count: regDelCount } = await admin
    .from('event_registrations')
    .delete({ count: 'exact' })
    .eq('event_id', eventId)
    .eq('email', normalEmail)
  if (regErr) captureException(regErr, { context: 'delete-registrant-event-reg', eventId, email: normalEmail })
  if (!regErr && regDelCount === 0) {
    // Email column may be null for auth members — resolve via members table
    const { data: member } = await admin.from('members').select('id').eq('email', normalEmail).maybeSingle()
    if (member?.id) {
      const { error: midErr } = await admin.from('event_registrations').delete().eq('event_id', eventId).eq('member_id', member.id)
      if (midErr) captureException(midErr, { context: 'delete-registrant-event-reg-by-memberid', eventId, email: normalEmail })
    }
  }

  // Remove event from applications.registrations array (covers both member and public registrants)
  const { data: ev } = await admin.from('events').select('name').eq('id', eventId).maybeSingle()
  if (ev?.name) {
    // Normalize through the alias map first — registrations stored under a
    // pre-rename event name must still match (e.g. the GP event rename)
    const evBase = s => (normalizeEventName(s) || '').trim().toLowerCase().split(/\s[—–]\s/)[0].trim()
    const { data: app } = await admin.from('applications').select('id, registrations').eq('email', normalEmail).maybeSingle()
    if (app?.registrations?.length) {
      const updated = app.registrations.filter(r => evBase(r.event) !== evBase(ev.name))
      if (updated.length !== app.registrations.length) {
        const { error: appUpdErr } = await admin.from('applications').update({ registrations: updated }).eq('id', app.id)
        if (appUpdErr) {
          captureException(new Error(appUpdErr.message), { context: 'delete-registrant-app-registrations', appId: app.id, eventId })
          return Response.json({ error: `Registrant removed from the event, but their application record could not be updated: ${appUpdErr.message}` }, { status: 500 })
        }
      }
    }

    // Revoke the RSVP token — otherwise the removed registrant's old
    // "confirm my spot" link still works and re-confirms them
    if (app?.id) {
      const { error: tokenDelErr } = await admin.from('rsvp_tokens')
        .delete().eq('application_id', app.id).eq('event_name', ev.name)
      if (tokenDelErr) captureException(new Error(tokenDelErr.message), { context: 'delete-registrant-rsvp-token', appId: app.id, eventId })
    }

    // Clear the member's attendance entry for this event so the Members
    // screen doesn't keep a stale attended/no-show mark
    const { data: memberRow } = await admin.from('members').select('id, event_attendance').eq('email', normalEmail).maybeSingle()
    if (memberRow?.event_attendance) {
      const key = attendanceKey(ev.name)
      if (key in memberRow.event_attendance) {
        const nextAttendance = { ...memberRow.event_attendance }
        delete nextAttendance[key]
        const { error: attDelErr } = await admin.from('members').update({ event_attendance: nextAttendance }).eq('id', memberRow.id)
        if (attDelErr) captureException(new Error(attDelErr.message), { context: 'delete-registrant-member-attendance', memberId: memberRow.id, eventId })
      }
    }
  }

  return Response.json({ success: true })
}
