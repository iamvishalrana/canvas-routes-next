import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../../lib/adminAudit.js'
import { captureMessage } from '../../../../../lib/sentry.js'

export async function PATCH(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const body = await request.json()
  const allowed = ['name', 'date', 'date_display', 'location', 'description', 'type', 'registration_url', 'registration_opens_at', 'registration_closes_at', 'capacity', 'member_price', 'priority_window_end', 'sort_order', 'registration_enabled', 'public_registration_enabled', 'registration_visibility', 'trip_length', 'checkin_enabled', 'checkin_sections', 'checkin_max_passengers', 'checkin_lunch_options', 'checkin_lunch_intro', 'checkin_waiver_text', 'checkin_waiver_text_fr', 'checkin_lunch_cutoff', 'awards_enabled', 'awards_categories', 'awards_ineligible_names', 'awards_slug']
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
  if ('trip_length' in update && !['Same Day', 'Overnight', 'Multiple Nights'].includes(update.trip_length)) update.trip_length = null
  if ('checkin_enabled' in update) update.checkin_enabled = Boolean(update.checkin_enabled)
  if ('checkin_sections' in update) update.checkin_sections = Array.isArray(update.checkin_sections) ? update.checkin_sections.filter(s => ['trip_details', 'waiver', 'lunch'].includes(s)) : []
  if ('checkin_max_passengers' in update) update.checkin_max_passengers = parseInt(update.checkin_max_passengers) || 2
  if ('checkin_lunch_options' in update) update.checkin_lunch_options = Array.isArray(update.checkin_lunch_options) ? update.checkin_lunch_options : []
  if ('checkin_waiver_text' in update) update.checkin_waiver_text = update.checkin_waiver_text || null
  if ('checkin_waiver_text_fr' in update) update.checkin_waiver_text_fr = update.checkin_waiver_text_fr || null
  if ('checkin_lunch_cutoff' in update) update.checkin_lunch_cutoff = update.checkin_lunch_cutoff || null
  if ('checkin_lunch_intro' in update) update.checkin_lunch_intro = update.checkin_lunch_intro || null
  if ('awards_enabled' in update) update.awards_enabled = Boolean(update.awards_enabled)
  if ('awards_categories' in update) update.awards_categories = Array.isArray(update.awards_categories) ? update.awards_categories : []
  if ('awards_ineligible_names' in update) update.awards_ineligible_names = Array.isArray(update.awards_ineligible_names) ? update.awards_ineligible_names : []
  if ('awards_slug' in update) update.awards_slug = update.awards_slug ? update.awards_slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || null : null
  const supabase = createAdminClient()
  const { error } = await supabase.from('events').update(update).eq('id', id)
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  await logAdminAction(supabase, adminUser?.email, { action: 'event.update', entityType: 'event', entityId: id, metadata: { fields: Object.keys(update).join(', ') } })
  return Response.json({ success: true })
}

export async function DELETE(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
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
    const { error: tokenErr } = await supabase.from('rsvp_tokens').delete().eq('event_name', ev.name)
    if (tokenErr) captureMessage('Orphaned rsvp_tokens after event delete', { error: tokenErr.message, eventName: ev.name })
  }

  await logAdminAction(supabase, adminUser?.email, { action: 'event.delete', entityType: 'event', entityId: id, entityName: ev?.name || null })

  return Response.json({ success: true })
}
