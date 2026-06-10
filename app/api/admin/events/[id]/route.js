import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'

export async function PATCH(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const body = await request.json()
  const allowed = ['name', 'date', 'location', 'description', 'type', 'registration_url', 'registration_opens_at', 'registration_closes_at', 'capacity', 'member_price', 'priority_window_end']
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
  if (Object.keys(update).length === 0) return Response.json({ error: 'No valid fields to update' }, { status: 400 })
  if ('member_price' in update) update.member_price = update.member_price != null ? parseInt(update.member_price) || null : null
  if ('capacity' in update) update.capacity = update.capacity != null ? parseInt(update.capacity) || null : null
  if ('registration_opens_at' in update) update.registration_opens_at = update.registration_opens_at || null
  if ('registration_closes_at' in update) update.registration_closes_at = update.registration_closes_at || null
  if ('priority_window_end' in update) update.priority_window_end = update.priority_window_end || null
  const supabase = createAdminClient()
  const { error } = await supabase.from('events').update(update).eq('id', id)
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  return Response.json({ success: true })
}

export async function DELETE(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  return Response.json({ success: true })
}
