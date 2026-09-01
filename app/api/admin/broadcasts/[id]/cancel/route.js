import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../../../lib/adminAudit.js'
import { captureMessage } from '../../../../../../lib/sentry'
import { broadcastPhase } from '../../../../../../lib/broadcastPhase.js'

// Cancels a still-scheduled broadcast before it goes out. Resend has no
// batch-cancel endpoint — this calls POST /emails/{id}/cancel once per
// recipient, throttled to avoid tripping its rate limit. No webhook fires
// for cancellation (unlike every other email lifecycle event), so
// canceled_at on the broadcasts row is the only record of it.
export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (!process.env.RESEND_API_KEY) return Response.json({ error: 'Resend is not configured.' }, { status: 503 })
  const { id } = await params
  const supabase = createAdminClient()

  const { data: broadcast, error: fetchErr } = await supabase
    .from('broadcasts').select('id, subject, sent_at, canceled_at').eq('id', id).maybeSingle()
  if (fetchErr) return Response.json({ error: fetchErr.message }, { status: 500 })
  if (!broadcast) return Response.json({ error: 'Broadcast not found.' }, { status: 404 })
  const phase = broadcastPhase(broadcast)
  if (phase === 'canceled') return Response.json({ error: 'Already canceled.' }, { status: 400 })
  if (phase === 'sent') return Response.json({ error: 'This broadcast has already gone out — nothing to cancel.' }, { status: 400 })

  const { data: recipients, error: recErr } = await supabase
    .from('broadcast_recipients')
    .select('resend_message_id')
    .eq('broadcast_id', id)
    .not('resend_message_id', 'is', null)
  if (recErr) return Response.json({ error: recErr.message }, { status: 500 })

  const messageIds = (recipients || []).map(r => r.resend_message_id)
  let canceled = 0
  let alreadySent = 0
  for (let i = 0; i < messageIds.length; i += 5) {
    const batch = messageIds.slice(i, i + 5)
    await Promise.all(batch.map(async msgId => {
      try {
        const res = await fetch(`https://api.resend.com/emails/${msgId}/cancel`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        })
        // A cancel call fails if the email already sent (race with its own
        // scheduled time) or was otherwise not cancelable — not a bug on our
        // end, just report it as "already sent" rather than an error.
        if (res.ok) canceled += 1
        else alreadySent += 1
      } catch (err) {
        captureMessage('Broadcast cancel: per-recipient cancel request failed', { error: err.message, broadcastId: id, msgId })
        alreadySent += 1
      }
    }))
    if (i + 5 < messageIds.length) await new Promise(r => setTimeout(r, 400))
  }

  // Recorded regardless of partial per-recipient failures above — the
  // admin's cancel intent is what canceled_at represents, not a guarantee
  // that literally zero emails went out.
  const { error: updateErr } = await supabase.from('broadcasts').update({ canceled_at: new Date().toISOString() }).eq('id', id)
  if (updateErr) captureMessage('Broadcast cancel: failed to record canceled_at', { error: updateErr.message, broadcastId: id })

  await logAdminAction(supabase, adminUser?.email, {
    action: 'broadcast.cancel_scheduled', entityType: 'broadcast', entityName: broadcast.subject,
    metadata: { canceled, alreadySent, total: messageIds.length },
  })

  return Response.json({ canceled, alreadySent, total: messageIds.length })
}
