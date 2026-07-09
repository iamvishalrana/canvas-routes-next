import { after } from 'next/server'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { captureException } from '../../../../../../lib/sentry'
import { buildRouteBroadcastHtml } from '../../../../../../lib/roadtripEmail'

// Emails a custom update to everyone who registered interest in a route.
export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
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
  const recipients = (interest || []).filter(r => r.email)
  if (!recipients.length) return Response.json({ error: 'No interested drivers to email yet.' }, { status: 400 })

  after(() => Promise.allSettled(recipients.map(r =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: r.email,
        subject: subject || `Update — ${route.name}`,
        html: buildRouteBroadcastHtml({ firstName: (r.name || '').split(' ')[0] || '', routeName: route.name, message }),
      }),
    }).catch(err => captureException(err, { context: 'route-broadcast-email' }))
  )))

  return Response.json({ success: true, emailed: recipients.length })
}
