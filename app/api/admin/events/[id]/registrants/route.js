import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { captureException } from '../../../../../../lib/sentry'
import { buildInviteHtml } from '../../../../../../lib/inviteEmail'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'

export async function GET(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('event_registrations')
    .select('id, email, name, stripe_payment_status, amount_paid, registered_at')
    .eq('event_id', id)
    .order('registered_at', { ascending: true })
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  return Response.json(data || [])
}

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const { name, email } = await request.json().catch(() => ({}))
  if (!name?.trim() || !email?.trim() || !email.includes('@')) {
    return Response.json({ error: 'Name and valid email are required.' }, { status: 400 })
  }

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

  // Upsert into applications — add this event to their registrations array
  const { data: existing } = await admin.from('applications')
    .select('id, registrations, source')
    .eq('email', normalEmail)
    .maybeSingle()

  const newReg = { event: ev.name, registered_at: new Date().toISOString(), attended: null }
  const prevRegs = (existing?.registrations || []).filter(r => r.event !== ev.name)

  const { data: appData, error: appErr } = await admin.from('applications').upsert({
    email: normalEmail,
    name: trimmedName,
    registrations: [...prevRegs, newReg],
    source: existing?.source || 'Manual — Admin',
    ...(existing ? { reregistered_at: new Date().toISOString() } : {}),
  }, { onConflict: 'email' }).select('id').maybeSingle()

  if (appErr) return Response.json({ error: appErr.message }, { status: 500 })

  const appId = appData?.id ?? (await admin.from('applications').select('id').eq('email', normalEmail).maybeSingle()).data?.id

  if (appId) {
    await admin.from('contacts').upsert(
      { application_id: appId },
      { onConflict: 'application_id', ignoreDuplicates: true }
    )
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
    } else if (!existingToken?.confirmed_at) {
      const firstName = trimmedName.split(' ')[0]
      const rsvpUrl = `${SITE}/rsvp/${tokenRow.token}`
      const isRoadTrip = ev.type === 'Road Trip'
      const textSignoff = isRoadTrip ? 'See you on the road' : 'See you there'

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Canvas Routes <jerry@canvasroutes.com>',
            to: normalEmail,
            reply_to: 'jerry@canvasroutes.com',
            subject: `You're invited — ${ev.name}`,
            html: buildInviteHtml(firstName, ev.name, ev.date, ev.location, rsvpUrl, expiresAt.toISOString(), isRoadTrip),
            text: `Hey ${firstName},\n\nYou're invited to ${ev.name}. Confirm your spot here:\n${rsvpUrl}\n\nThis link expires ${expiresAt.toLocaleDateString('en-CA', { month: 'long', day: 'numeric' })}.\n\n${textSignoff},\nJerry`,
          }),
        })
      } catch (err) {
        captureException(err, { context: 'registrant-auto-invite-email', email: normalEmail, eventId: id })
      }
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

  // Remove from event_registrations (member-portal registrations)
  const { error: regErr } = await admin
    .from('event_registrations')
    .delete()
    .eq('event_id', eventId)
    .eq('email', normalEmail)
  if (regErr) captureException(regErr, { context: 'delete-registrant-event-reg', eventId, email: normalEmail })

  // Remove event from applications.registrations array (covers both member and public registrants)
  const { data: ev } = await admin.from('events').select('name').eq('id', eventId).maybeSingle()
  if (ev?.name) {
    const { data: app } = await admin.from('applications').select('id, registrations').eq('email', normalEmail).maybeSingle()
    if (app?.registrations?.length) {
      const evBase = s => (s || '').trim().toLowerCase().split(/\s[—–]\s/)[0].trim()
      const updated = app.registrations.filter(r => evBase(r.event) !== evBase(ev.name))
      if (updated.length !== app.registrations.length) {
        await admin.from('applications').update({ registrations: updated }).eq('id', app.id)
      }
    }
  }

  return Response.json({ success: true })
}
