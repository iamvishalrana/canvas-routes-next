import { requireAdmin } from '../../../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../../lib/sentry'
import { buildInviteHtml } from '../../../../../../../lib/inviteEmail'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'


export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { email, name, isResend = false } = await request.json().catch(() => ({}))

  if (!email?.trim() || !name?.trim()) {
    return Response.json({ error: 'Email and name are required.' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'Email not configured.' }, { status: 503 })
  }

  const admin = createAdminClient()

  const [{ data: ev }, { data: app }] = await Promise.all([
    admin.from('events').select('id, name, date, date_display, location, type').eq('id', id).single(),
    admin.from('applications').select('id').eq('email', email.toLowerCase().trim()).maybeSingle(),
  ])

  if (!ev) return Response.json({ error: 'Event not found.' }, { status: 404 })

  // Auto-create application row for member-portal registrants who don't have one
  let appId = app?.id
  if (!appId) {
    const { data: created } = await admin.from('applications').upsert(
      { email: email.toLowerCase().trim(), name: name.trim() },
      { onConflict: 'email', ignoreDuplicates: false }
    ).select('id').maybeSingle()
    appId = created?.id ?? (await admin.from('applications').select('id').eq('email', email.toLowerCase().trim()).maybeSingle()).data?.id
    if (!appId) return Response.json({ error: 'Could not resolve application record.' }, { status: 500 })
  }

  const isRoadTrip = ev.type === 'Road Trip' || ev.type === 'Route'
  const now = new Date()
  let expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  if (ev.date) {
    const evDate = new Date(ev.date)
    const cutoff = new Date(evDate.getTime() - 48 * 60 * 60 * 1000)
    if (cutoff < expiresAt) expiresAt = cutoff
  }
  if (expiresAt <= now) expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  // Preserve confirmed_at and answers if already set — re-sending must not un-confirm
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
    captureException(tokenErr, { context: 'admin-registrant-invite-token', appId, eventId: id })
    return Response.json({ error: 'Failed to create invitation link.' }, { status: 500 })
  }

  const firstName = name.trim().split(' ')[0]
  const rsvpUrl = `${SITE}/rsvp/${tokenRow.token}`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Canvas Routes <jerry@canvasroutes.com>',
        to: email.trim(),
        reply_to: 'jerry@canvasroutes.com',
        subject: isResend ? `Reminder — your spot at ${ev.name}` : `You're confirmed — ${ev.name}`,
        html: buildInviteHtml(firstName, ev.name, ev.date, ev.location, rsvpUrl, expiresAt.toISOString(), isRoadTrip, isResend),
        text: isResend
          ? `Hey ${firstName},\n\nJust a reminder — your invitation to ${ev.name} is still open. Check in here:\n${rsvpUrl}\n\nThis link expires ${expiresAt.toLocaleDateString('en-CA', { month: 'long', day: 'numeric' })}.\n\nSee you there,\nJerry`
          : `Hey ${firstName},\n\nYou're confirmed for ${ev.name}. Check in here:\n${rsvpUrl}\n\nThis link expires ${expiresAt.toLocaleDateString('en-CA', { month: 'long', day: 'numeric' })}.\n\nSee you there,\nJerry`,
      }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      return Response.json({ error: d.message || `Resend error ${res.status}` }, { status: 502 })
    }
    return Response.json({ success: true })
  } catch (err) {
    captureException(err, { context: 'admin-registrant-invite-email', email, eventId: id })
    return Response.json({ error: 'Failed to send email.' }, { status: 500 })
  }
}
