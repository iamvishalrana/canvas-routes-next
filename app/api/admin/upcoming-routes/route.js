import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureException } from '../../../../lib/sentry'

function slugify(str) {
  return (str || '').trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()
  const [{ data: routes, error }, { data: interest }] = await Promise.all([
    supabase.from('upcoming_routes').select('*').order('sort_order', { ascending: true }),
    supabase.from('route_interest').select('route_id, name, email, membership_optin, is_member, created_at').order('created_at', { ascending: false }),
  ])
  if (error) {
    captureException(new Error(error.message), { context: 'admin-roadtrips-list' })
    return Response.json({ error: error.message }, { status: 500 })
  }
  const byRoute = {}
  for (const r of interest || []) { (byRoute[r.route_id] ||= []).push(r) }
  const result = (routes || []).map(r => ({ ...r, interest: byRoute[r.id] || [], interested_count: (byRoute[r.id] || []).length }))
  return Response.json(result)
}

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }

  const name = (body.name || '').trim()
  const destination = (body.destination || '').trim()
  const monthLabel = (body.month_label || '').trim()
  if (!name) return Response.json({ error: 'Name is required.' }, { status: 400 })
  if (!destination) return Response.json({ error: 'Destination is required.' }, { status: 400 })
  if (!monthLabel) return Response.json({ error: 'Month is required.' }, { status: 400 })
  const slug = slugify(body.slug) || slugify(name)
  if (!slug) return Response.json({ error: 'Could not derive a slug.' }, { status: 400 })
  const target = parseInt(body.target_count, 10)
  const tripType = ['day', 'overnight', 'multi_day'].includes(body.trip_type) ? body.trip_type : 'day'

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('upcoming_routes').insert({
    slug,
    name,
    destination,
    month_label: monthLabel,
    description: (body.description || '').trim(),
    duration_label: (body.duration_label || '').trim(),
    distance_label: (body.distance_label || '').trim(),
    target_count: Number.isFinite(target) && target > 0 ? target : 12,
    sort_order: parseInt(body.sort_order, 10) || 0,
    trip_type: tripType,
    is_active: body.is_active !== false,
  }).select('*').single()
  if (error) {
    if (error.code === '23505') return Response.json({ error: 'A route with that slug already exists.' }, { status: 409 })
    captureException(error, { context: 'admin-roadtrips-create' })
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ ...data, interest: [], interested_count: 0 })
}
