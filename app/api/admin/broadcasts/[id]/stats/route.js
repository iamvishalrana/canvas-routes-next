import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'

// Per-broadcast delivery stats — joins broadcast_recipients (captured at send
// time, see app/api/admin/broadcasts/route.js) against email_events (the
// existing Resend webhook log, populated independently of this route) by
// resend_message_id. Broadcasts sent before broadcast_recipients existed
// (2026-08-21) have no rows here at all — recipients comes back empty and
// the client shows "no delivery data for this broadcast" rather than zeros,
// which would misleadingly read as "sent to nobody" or "everyone pending".
export async function GET(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const supabase = createAdminClient()
  const { data: recipients, error: recErr } = await supabase
    .from('broadcast_recipients')
    .select('email, name, resend_message_id, send_error')
    .eq('broadcast_id', id)
  if (recErr) return Response.json({ error: recErr.message }, { status: 500 })

  const messageIds = [...new Set((recipients || []).map(r => r.resend_message_id).filter(Boolean))]
  const { data: events, error: evErr } = messageIds.length
    ? await supabase.from('email_events').select('resend_message_id, event_type').in('resend_message_id', messageIds)
    : { data: [] }
  if (evErr) return Response.json({ error: evErr.message }, { status: 500 })

  const typesByMessageId = new Map()
  for (const e of (events || [])) {
    if (!typesByMessageId.has(e.resend_message_id)) typesByMessageId.set(e.resend_message_id, new Set())
    typesByMessageId.get(e.resend_message_id).add(e.event_type)
  }

  const counts = { total: (recipients || []).length, sendFailed: 0, pending: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0 }
  const detail = (recipients || []).map(r => {
    if (!r.resend_message_id) {
      counts.sendFailed++
      return { email: r.email, name: r.name, status: 'send_failed', detail: r.send_error || null }
    }
    const types = typesByMessageId.get(r.resend_message_id) || new Set()
    const bounced = types.has('email.bounced')
    const complained = types.has('email.complained')
    const clicked = types.has('email.clicked')
    const opened = types.has('email.opened')
    const delivered = types.has('email.delivered')
    // Independent flags in the aggregate (a bounce can still show as
    // "delivered" if it later hard-bounced after acceptance) — but the
    // per-recipient badge picks ONE status, the strongest milestone reached.
    if (bounced) counts.bounced++
    if (complained) counts.complained++
    if (clicked) counts.clicked++
    if (opened) counts.opened++
    if (delivered) counts.delivered++
    if (types.size === 0) counts.pending++
    // Status keys mirror EVENT_META in app/admin/email-activity/EmailActivityClient.jsx
    // (email.bounced / email.complained / email.clicked / email.opened /
    // email.delivered / email.sent) plus two pseudo-states EVENT_META has no
    // use for: 'pending' (message accepted by Resend, no webhook event yet)
    // and 'send_failed' (Resend never created a message at all).
    const status = bounced ? 'email.bounced' : complained ? 'email.complained'
      : clicked ? 'email.clicked' : opened ? 'email.opened' : delivered ? 'email.delivered'
      : types.size > 0 ? 'email.sent' : 'pending'
    return { email: r.email, name: r.name, status }
  })

  return Response.json({ counts, recipients: detail })
}
