import { after } from 'next/server'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry'
import { buildRouteLaunchHtml } from '../../../../../../lib/roadtripEmail'

// Marks a route launched and emails every interested driver the launch email.
export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
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

  const recipients = (interest || []).filter(r => r.email)
  if (recipients.length) {
    after(() => Promise.allSettled(recipients.map(r =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Canvas Routes <info@canvasroutes.com>',
          to: r.email,
          subject: `${route.name} is launching — Canvas Routes`,
          html: buildRouteLaunchHtml({
            firstName: (r.name || '').split(' ')[0] || '',
            routeName: route.name,
            monthLabel: route.month_label,
            destination: route.destination,
            message,
            pricePerCar: route.price_per_car,
            maxCars: route.max_cars,
            itinerary: route.itinerary,
          }),
        }),
      }).catch(err => captureException(err, { context: 'roadtrip-launch-email' }))
    )))
  }

  return Response.json({ ...updated, emailed: recipients.length })
}
