import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'
import { captureException } from '../../../../../../lib/sentry.js'

// Lets an admin change a registrant's already-submitted lunch selection
// (wrong dish picked, dietary change after the fact, etc.) — the public
// check-in route only lets the registrant themselves set it once and edit
// before the cutoff, with no admin override.
export async function PATCH(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { eventId } = await params

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const email = (body?.email || '').toLowerCase().trim()
  const picks = body?.lunch
  if (!email) return Response.json({ error: 'Missing email.' }, { status: 400 })
  // Empty array is allowed — an admin removing every passenger (down to
  // zero) from a registrant's lunch order is a legitimate action, not a
  // malformed request.
  if (!Array.isArray(picks)) return Response.json({ error: 'Missing lunch selections.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: event, error: eventErr } = await admin.from('events')
    .select('id, name, checkin_lunch_options').eq('id', eventId).maybeSingle()
  if (eventErr || !event) return Response.json({ error: 'Event not found' }, { status: 404 })

  const lunchOptions = event.checkin_lunch_options || []
  const lunchRecord = []
  for (const pick of picks) {
    const dish = lunchOptions.find(d => d.id === pick.dish_id)
    if (!dish) return Response.json({ error: `Invalid dish for ${pick.name || 'a passenger'}.` }, { status: 400 })
    lunchRecord.push({ name: pick.name || '', dish_id: dish.id, dish_name: dish.name, selected_at: new Date().toISOString() })
  }

  const { data: existing } = await admin.from('event_checkins')
    .select('name').eq('event_id', eventId).eq('email', email).maybeSingle()
  if (!existing) return Response.json({ error: 'No check-in record found for this email.' }, { status: 404 })

  const { error: updErr } = await admin.from('event_checkins').upsert(
    { event_id: eventId, email, name: existing.name, lunch: lunchRecord, updated_at: new Date().toISOString() },
    { onConflict: 'event_id,email' }
  )
  if (updErr) {
    captureException(updErr, { context: 'admin-edit-lunch', eventId, email })
    return Response.json({ error: 'Failed to save.' }, { status: 500 })
  }
  return Response.json({ success: true, lunch: lunchRecord })
}
