import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../lib/adminAudit.js'
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit'

export async function GET(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 200, 60)) return Response.json({ error: 'Too many requests' }, { status: 429 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('events').select('*').order('sort_order', { ascending: true, nullsFirst: false }).order('date', { ascending: true })
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  // Short client-side cache so quickly flipping between admin tabs doesn't always
  // cold-refetch — realtime sync still pushes updates within the window.
  return Response.json(data, { headers: { 'Cache-Control': 'private, max-age=15' } })
}

export async function POST(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 200, 60)) return Response.json({ error: 'Too many requests' }, { status: 429 })
  const { name, date, date_display, location, description, type, registration_url, registration_opens_at, registration_closes_at, capacity, member_price, priority_window_end, registration_visibility, trip_length } = await request.json()
  if (!name?.trim()) return Response.json({ error: 'Name required.' }, { status: 400 })
  if (!date?.trim()) return Response.json({ error: 'Date required.' }, { status: 400 })
  if (!type?.trim()) return Response.json({ error: 'Type required.' }, { status: 400 })
  if (member_price && Math.round(parseFloat(member_price)) < 0) return Response.json({ error: 'Price cannot be negative.' }, { status: 400 })
  if (registration_opens_at && registration_closes_at && new Date(registration_closes_at) <= new Date(registration_opens_at))
    return Response.json({ error: 'Registration close time must be after open time.' }, { status: 400 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('events').insert({
    name: name.trim(),
    date: date.trim(),
    date_display: date_display?.trim() || null,
    location: location?.trim() || null,
    description: description?.trim() || null,
    type: type.trim(),
    registration_url: registration_url?.trim() || null,
    registration_opens_at: registration_opens_at || null,
    registration_closes_at: registration_closes_at || null,
    capacity: capacity ? parseInt(capacity) : null,
    member_price: member_price ? Math.round(parseFloat(member_price)) : null,
    priority_window_end: priority_window_end || null,
    registration_visibility: ['members', 'public'].includes(registration_visibility) ? registration_visibility : 'members',
    trip_length: ['Same Day', 'Overnight', 'Multiple Nights'].includes(trip_length) ? trip_length : null,
  }).select().single()
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  await logAdminAction(supabase, adminUser?.email, {
    action: 'event.create', entityType: 'event', entityId: data.id, entityName: data.name,
    metadata: { date: data.date, type: data.type },
  })
  return Response.json(data)
}
