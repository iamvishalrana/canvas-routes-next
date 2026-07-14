import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { captureException } from '../../../../../lib/sentry'

const ALLOWED = ['name', 'destination', 'month_label', 'description', 'duration_label', 'distance_label', 'target_count', 'sort_order', 'trip_type', 'price_per_car', 'price_range', 'max_cars', 'itinerary', 'activity_options', 'dest_lat', 'dest_lng', 'is_active', 'slug']

export async function PATCH(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)))
  if (update.target_count != null) {
    const t = parseInt(update.target_count, 10)
    if (!Number.isFinite(t) || t < 1) return Response.json({ error: 'Target must be at least 1.' }, { status: 400 })
    update.target_count = t
  }
  if (update.sort_order != null) update.sort_order = parseInt(update.sort_order, 10) || 0
  if ('price_range' in update) update.price_range = (update.price_range || '').trim() || null
  if ('price_per_car' in update) {
    update.price_per_car = update.price_per_car === '' || update.price_per_car == null ? null
      : (Number.isFinite(parseFloat(update.price_per_car)) ? parseFloat(update.price_per_car) : null)
  }
  if ('max_cars' in update) {
    const m = parseInt(update.max_cars, 10)
    update.max_cars = Number.isFinite(m) && m > 0 ? m : null
  }
  if ('itinerary' in update) update.itinerary = (update.itinerary || '').trim()
  for (const k of ['dest_lat', 'dest_lng']) {
    if (k in update) {
      const v = parseFloat(update[k])
      update[k] = Number.isFinite(v) ? v : null
    }
  }
  if ('activity_options' in update) {
    update.activity_options = Array.isArray(update.activity_options)
      ? update.activity_options.filter(a => typeof a === 'string' && a.trim()).slice(0, 12).map(a => a.trim().slice(0, 40))
      : []
  }
  if (!Object.keys(update).length) return Response.json({ error: 'Nothing to update.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('upcoming_routes').update(update).eq('id', id).select('*').single()
  if (error) {
    if (error.code === '23505') return Response.json({ error: 'A route with that slug already exists.' }, { status: 409 })
    captureException(error, { context: 'admin-roadtrips-patch', id })
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json(data)
}

export async function DELETE(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('upcoming_routes').delete().eq('id', id) // cascades route_interest
  if (error) {
    captureException(error, { context: 'admin-roadtrips-delete', id })
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ success: true })
}
