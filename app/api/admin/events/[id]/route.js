import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'

export async function PATCH(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const body = await request.json()
  const allowed = ['name', 'date', 'date_display', 'location', 'description', 'type', 'registration_url', 'registration_opens_at', 'registration_closes_at', 'capacity', 'member_price', 'priority_window_end', 'sort_order', 'registration_enabled', 'public_registration_enabled', 'registration_visibility']
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
  if (Object.keys(update).length === 0) return Response.json({ error: 'No valid fields to update' }, { status: 400 })
  if ('member_price' in update && update.member_price != null && update.member_price < 0)
    return Response.json({ error: 'Price cannot be negative.' }, { status: 400 })
  if ('registration_opens_at' in update && 'registration_closes_at' in update && update.registration_opens_at && update.registration_closes_at && new Date(update.registration_closes_at) <= new Date(update.registration_opens_at))
    return Response.json({ error: 'Registration close time must be after open time.' }, { status: 400 })
  if ('member_price' in update) update.member_price = update.member_price != null ? Math.round(parseFloat(update.member_price)) || null : null
  if ('capacity' in update) update.capacity = update.capacity != null ? parseInt(update.capacity) || null : null
  if ('registration_opens_at' in update) update.registration_opens_at = update.registration_opens_at || null
  if ('registration_closes_at' in update) update.registration_closes_at = update.registration_closes_at || null
  if ('priority_window_end' in update) update.priority_window_end = update.priority_window_end || null
  if ('registration_enabled' in update) update.registration_enabled = update.registration_enabled == null ? null : Boolean(update.registration_enabled)
  if ('public_registration_enabled' in update) update.public_registration_enabled = update.public_registration_enabled == null ? null : Boolean(update.public_registration_enabled)
  if ('registration_visibility' in update && !['members', 'public'].includes(update.registration_visibility)) update.registration_visibility = 'members'
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

  // Fetch event data before deletion so we can clean up storage and tokens
  const { data: ev } = await supabase.from('events').select('name, photo_url').eq('id', id).maybeSingle()

  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })

  // Clean up storage photo (event_registrations cascades via FK; rsvp_tokens has no FK to events)
  if (ev?.photo_url) {
    try {
      const u = new URL(ev.photo_url)
      const match = u.pathname.match(/\/storage\/v1\/object\/public\/event-photos\/(.+)/)
      const storagePath = match ? match[1].split('?')[0] : null
      if (storagePath) await supabase.storage.from('event-photos').remove([storagePath]).catch(() => {})
    } catch {}
  }

  // Delete orphaned rsvp_tokens (no FK cascade since rsvp_tokens has no event_id column)
  if (ev?.name) {
    await supabase.from('rsvp_tokens').delete().eq('event_name', ev.name)
  }

  return Response.json({ success: true })
}
