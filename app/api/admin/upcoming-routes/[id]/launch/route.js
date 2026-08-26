import { after } from 'next/server'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException, captureMessage } from '../../../../../../lib/sentry'
import { logAdminAction } from '../../../../../../lib/adminAudit.js'
import { buildRouteLaunchHtml } from '../../../../../../lib/roadtripEmail'
import { buildBulkEmail, filterUnsubscribed } from '../../../../../../lib/emailUnsubscribe.js'
import { ensureRouteEventLinked } from '../../../../../../lib/routeEventLink'

const MAX_RECIPIENTS = 2000
const RESEND_BATCH_SIZE = 100 // Resend /emails/batch max per call

// Sends the launch email batch via after() — shared by the initial launch
// and the "Resend Launch Email" action, since both mean "email everyone on
// the interest list the same launch message." Up to MAX_RECIPIENTS/
// RESEND_BATCH_SIZE (20) sequential Resend calls, so this must never be
// awaited before the response (CLAUDE.md rule 8 — client timeout risk).
function sendLaunchEmails(supabase, { id, route, recipients, message }) {
  if (!recipients.length) return
  after(async () => {
    let toSend = recipients
    try {
      toSend = await filterUnsubscribed(supabase, recipients)
    } catch (err) {
      captureMessage('Route launch email blocked — unsubscribe list unreadable', { error: err.message, routeId: id })
      toSend = []
    }
    toSend = toSend.slice(0, MAX_RECIPIENTS)

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

    for (let i = 0; i < toSend.length; i += RESEND_BATCH_SIZE) {
      const batch = toSend.slice(i, i + RESEND_BATCH_SIZE)
      try {
        const res = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify(batch.map(emailFor)),
        })
        if (!res.ok) captureMessage('Route launch email batch failed', { status: res.status, routeId: id, batchSize: batch.length })
      } catch (err) {
        captureException(err, { context: 'roadtrip-launch-email', routeId: id })
      }
    }
  })
}

// Marks a route launched and emails every interested driver the launch
// email — or, with { resend: true }, just re-sends that same launch email
// to the interest list without re-launching (recovery path for when the
// interest-list fetch failed during the original launch, or an admin just
// wants to nudge stragglers again).
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

  if (body.resend === true) {
    if (!route.launched) return Response.json({ error: "This route hasn't been launched yet." }, { status: 400 })
    const { data: interest, error: interestErr } = await supabase
      .from('route_interest').select('name, email').eq('route_id', id)
    if (interestErr) {
      captureException(interestErr, { context: 'admin-roadtrips-launch-resend-interest-select', id })
      return Response.json({ error: 'Could not load the interested-driver list.' }, { status: 500 })
    }
    const recipients = (interest || []).filter(r => r.email)
    await logAdminAction(supabase, adminUser?.email, {
      action: 'route.launch_resend', entityType: 'upcoming_route', entityId: id, entityName: route.name,
      metadata: { recipientCount: recipients.length },
    })
    sendLaunchEmails(supabase, { id, route, recipients, message })
    return Response.json({ recipientCount: recipients.length })
  }

  if (route.launched) return Response.json({ error: 'This route has already been launched.' }, { status: 400 })

  // Compare-and-swap via .eq('launched', false) — two admins (or a double-
  // click) hitting this concurrently both pass the snapshot check above, but
  // only one's UPDATE actually matches a row; the loser gets updated:null
  // back and is told to retry instead of both sending the launch email batch.
  const { data: updated, error: updErr } = await supabase
    .from('upcoming_routes')
    .update({ launched: true, launched_at: new Date().toISOString() })
    .eq('id', id).eq('launched', false).select('*').maybeSingle()
  if (updErr) {
    captureException(updErr, { context: 'admin-roadtrips-launch', id })
    return Response.json({ error: updErr.message }, { status: 500 })
  }
  if (!updated) {
    return Response.json({ error: 'This route was just launched by another request.' }, { status: 409 })
  }

  const { data: interest, error: interestErr } = await supabase
    .from('route_interest').select('name, email').eq('route_id', id)
  if (interestErr) {
    // Route is already marked launched (can't be undone from here without
    // risking a double-launch email on retry) — surface the failure instead
    // of silently reporting "0 emailed" with no way to tell it was an error.
    // The admin can use { resend: true } once the underlying issue is fixed.
    captureException(interestErr, { context: 'admin-roadtrips-launch-interest-select', id })
  }

  // Safety net: routes created before the auto-link existed (or via any path
  // that skipped it) would otherwise launch with no Registrants/Check-in/
  // Awards tabs and no way to get them short of a manual DB fix.
  const linkedRoute = await ensureRouteEventLinked(supabase, updated)

  await logAdminAction(supabase, adminUser?.email, {
    action: 'route.launch', entityType: 'upcoming_route', entityId: id, entityName: route.name,
    metadata: { recipientCount: (interest || []).filter(r => r.email).length },
  })

  const recipients = (interest || []).filter(r => r.email)
  sendLaunchEmails(supabase, { id, route, recipients, message })

  return Response.json({ ...linkedRoute, recipientCount: recipients.length, interestListError: !!interestErr })
}
