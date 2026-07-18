import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException, captureMessage } from '../../../../../../lib/sentry'
import { logAdminAction } from '../../../../../../lib/adminAudit.js'
import { buildRouteBroadcastHtml } from '../../../../../../lib/roadtripEmail'
import { buildBulkEmail, filterUnsubscribed } from '../../../../../../lib/emailUnsubscribe.js'

const MAX_RECIPIENTS = 2000
const RESEND_BATCH_SIZE = 100 // Resend /emails/batch max per call

// Emails a custom update to everyone who registered interest in a route.
export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  let body = {}
  try { body = await request.json() } catch {}
  const subject = (body.subject || '').trim()
  const message = (body.message || '').trim()
  if (!message) return Response.json({ error: 'Message is required.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: route, error: routeErr } = await supabase
    .from('upcoming_routes').select('id, name').eq('id', id).maybeSingle()
  if (routeErr || !route) return Response.json({ error: 'Route not found.' }, { status: 404 })

  const { data: interest } = await supabase
    .from('route_interest').select('name, email').eq('route_id', id)
  let recipients = (interest || []).filter(r => r.email)
  if (!recipients.length) return Response.json({ error: 'No interested drivers to email yet.' }, { status: 400 })

  // Filter out anyone who has unsubscribed. Fail closed: if the list can't be
  // read we must not risk emailing people who opted out — abort before sending.
  try {
    recipients = await filterUnsubscribed(supabase, recipients)
  } catch (err) {
    captureMessage('Route broadcast blocked — unsubscribe list unreadable', { error: err.message, routeId: id })
    return Response.json({ error: `Could not check the unsubscribe list (${err.message}). Not sent.` }, { status: 500 })
  }
  recipients = recipients.slice(0, MAX_RECIPIENTS)
  if (!recipients.length) return Response.json({ sent: 0, failed: 0, emailed: 0 })

  const emailFor = recipient => buildBulkEmail({
    from: 'Canvas Routes <info@canvasroutes.com>',
    replyTo: 'info@canvasroutes.com',
    recipient,
    subject: subject || `Update — ${route.name}`,
    html: buildRouteBroadcastHtml({ firstName: (recipient.name || '').split(' ')[0] || '', routeName: route.name, message }),
  })

  let sent = 0, failed = 0
  for (let i = 0; i < recipients.length; i += RESEND_BATCH_SIZE) {
    const batch = recipients.slice(i, i + RESEND_BATCH_SIZE)
    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify(batch.map(emailFor)),
      })
      if (res.ok) sent += batch.length
      else failed += batch.length
    } catch (err) {
      captureException(err, { context: 'route-broadcast-email', routeId: id })
      failed += batch.length
    }
  }

  await logAdminAction(supabase, adminUser?.email, {
    action: 'route.broadcast', entityType: 'upcoming_route', entityId: id, entityName: route.name,
    metadata: { sent, failed },
  })

  return Response.json({ success: true, sent, failed, emailed: sent })
}
