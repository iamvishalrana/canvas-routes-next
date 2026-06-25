import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { checkRateLimit } from '../../../../lib/rateLimit'

export async function GET(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
  if (await checkRateLimit(ip, 200, 60)) return Response.json({ error: 'Too many requests' }, { status: 429 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('events').select('*').order('sort_order', { ascending: true, nullsFirst: false }).order('date', { ascending: true })
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  return Response.json(data)
}

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
  if (await checkRateLimit(ip, 200, 60)) return Response.json({ error: 'Too many requests' }, { status: 429 })
  const { name, date, date_display, location, description, type, registration_url, registration_opens_at, registration_closes_at, capacity, member_price, priority_window_end, registration_visibility } = await request.json()
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
  }).select().single()
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  return Response.json(data)
}
