import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException, captureMessage } from '../../../../../../lib/sentry'
import { logAdminAction } from '../../../../../../lib/adminAudit.js'
import { buildRouteLaunchHtml } from '../../../../../../lib/roadtripEmail'
import { buildBulkEmail, filterUnsubscribed } from '../../../../../../lib/emailUnsubscribe.js'

const MAX_RECIPIENTS = 2000
const RESEND_BATCH_SIZE = 100 // Resend /emails/batch max per call

// Marks a route launched and emails every interested driver the launch email.
export async function POST(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  let body = {}
  try { body = await request.json() } catch {}
  const message = (body.message || '').trim()

  const supabase = createAdminClient()
  const { data: route, error: routeErr } = await supabase
    .from('upcoming_routes').select('*').eq('id', id).maybeSingle()
  if (routeErr || !route) return Response.json({ error: 'Route not found.' }, { status: 404 })
  if (route.launched) return Response.json({ error: 'This route has already been launched.' }, { status: 400 })

  const { data: interest } = await supabase
    .from('route_interest').select('name, email').eq('route_id', id)

  const { data: updated, error: updErr } = await supabase
    .from('upcoming_routes')
    .update({ launched: true, launched_at: new Date().toISOString() })
    .eq('id', id).select('*').single()
  if (updErr) {
    captureException(updErr, { context: 'admin-roadtrips-launch', id })
    return Response.json({ error: updErr.message }, { status: 500 })
  }

  let recipients = (interest || []).filter(r => r.email)
  let sent = 0, failed = 0

  if (recipients.length) {
    // Filter out anyone who has unsubscribed. Fail closed: if the list can't
    // be read, skip sending rather than risk emailing an opted-out address —
    // the route is already marked launched either way.
    try {
      recipients = await filterUnsubscribed(supabase, recipients)
    } catch (err) {
      captureMessage('Route launch email blocked — unsubscribe list unreadable', { error: err.message, routeId: id })
      recipients = []
    }
    recipients = recipients.slice(0, MAX_RECIPIENTS)

    const emailFor = recipient => buildBulkEmail({
      from: 'Canvas Routes <info@canvasroutes.com>',
      replyTo: 'info@canvasroutes.com',
      recipient,
      subject: `${route.name} is launching — Canvas Routes`,
      html: buildRouteLaunchHtml({
        firstName: (recipient.name || '').split(' ')[0] || '',
        routeName: route.name,
        monthLabel: route.month_label,
        destination: route.destination,
        message,
        pricePerCar: route.price_per_car,
        maxCars: route.max_cars,
        itinerary: route.itinerary,
      }),
    })

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
        captureException(err, { context: 'roadtrip-launch-email', routeId: id })
        failed += batch.length
      }
    }
  }

  await logAdminAction(supabase, adminUser?.email, {
    action: 'route.launch', entityType: 'upcoming_route', entityId: id, entityName: route.name,
    metadata: { sent, failed },
  })

  return Response.json({ ...updated, sent, failed, emailed: sent })
}
