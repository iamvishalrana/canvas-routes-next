import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { captureMessage } from '../../../../../lib/sentry.js'
import { attendanceKey } from '../../../../../lib/eventMeta.js'

export async function PATCH(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const body = await request.json()
  const supabase = createAdminClient()
  const ALLOWED = ['name', 'car_year', 'car_make', 'car_model', 'car_paint', 'phone', 'instagram',
                   'dob_month', 'dob_day', 'dob_year', 'source', 'more', 'registrations', 'reregistered_at', 'admin_notes', 'notes']
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)))
  if (Object.keys(update).length === 0) return Response.json({ error: 'No valid fields to update' }, { status: 400 })
  const { error } = await supabase.from('applications').update(update).eq('id', id)
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })

  // Sync shared fields to members table
  const { data: app } = await supabase.from('applications').select('email').eq('id', id).single()
  if (app?.email) {
    const memberSync = {}
    if ('name' in body) memberSync.name = body.name?.trim() || null
    if ('phone' in body) memberSync.phone = body.phone || null
    if ('instagram' in body) memberSync.instagram = body.instagram || null
    if ('dob_month' in body) memberSync.dob_month = body.dob_month ?? null
    if ('dob_day' in body) memberSync.dob_day = body.dob_day ?? null
    if ('dob_year' in body) memberSync.dob_year = body.dob_year ?? null
    if ('notes' in body) memberSync.notes = body.notes || null
    if ('admin_notes' in body) memberSync.admin_notes = body.admin_notes || null
    if ('car_year' in body) memberSync.car_year = body.car_year || null
    if ('car_make' in body) memberSync.car_make = body.car_make || null
    if ('car_model' in body) memberSync.car_model = body.car_model || null
    if ('car_paint' in body) memberSync.car_paint = body.car_paint || null
    if (Object.keys(memberSync).length > 0) {
      const { data: mem } = await supabase.from('members').select('id').eq('email', app.email.toLowerCase()).maybeSingle()
      if (mem) {
        const { error: syncErr } = await supabase.from('members').update(memberSync).eq('id', mem.id)
        if (syncErr) captureMessage('Application→member field sync failed', { error: syncErr.message, appId: id, memberId: mem.id })
      }
    }
  }

  // Sync quick note → contacts.notes (contacts has its own notes column;
  // without this leg the Contacts screen shows a stale note)
  if ('notes' in body) {
    const { data: contact } = await supabase.from('contacts').select('id').eq('application_id', id).maybeSingle()
    if (contact?.id) {
      const { error: contactNoteErr } = await supabase.from('contacts').update({ notes: body.notes || null }).eq('id', contact.id)
      if (contactNoteErr) captureMessage('Application→contact note sync failed', { error: contactNoteErr.message, appId: id, contactId: contact.id })
    }
  }

  // Sync registrations attendance → members.event_attendance
  if ('registrations' in body && app?.email) {
    const { data: member } = await supabase.from('members').select('id, event_attendance').eq('email', app.email.toLowerCase()).maybeSingle()
    if (member) {
      const attendance = { ...(member.event_attendance || {}) }
      for (const reg of (body.registrations || [])) {
        if (!reg.event) continue
        attendance[attendanceKey(reg.event)] = reg.attended ?? null
      }
      const { error: attErr } = await supabase.from('members').update({ event_attendance: attendance }).eq('id', member.id)
      if (attErr) captureMessage('Application→member attendance sync failed', { error: attErr.message, appId: id, memberId: member.id })
    }
  }

  return Response.json({ success: true })
}

export async function DELETE(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const supabase = createAdminClient()

  // Fetch email before deletion so we can clean up the linked member
  const { data: app } = await supabase.from('applications').select('email').eq('id', id).maybeSingle()

  const { error } = await supabase.from('applications').delete().eq('id', id)
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })

  // Clean up linked member (no FK between applications and members — must be explicit)
  if (app?.email) {
    const { data: mem } = await supabase.from('members').select('id, car_photo_url, profile_photo_url').eq('email', app.email.toLowerCase().trim()).maybeSingle()
    if (mem) {
      const photoFilename = mem.car_photo_url?.split('/').pop()?.split('?')[0]
      const avatarFilename = mem.profile_photo_url?.split('/').pop()?.split('?')[0]
      const photoPaths = [
        ...(photoFilename ? [photoFilename] : [`${mem.id}.jpg`, `${mem.id}.jpeg`, `${mem.id}.png`, `${mem.id}.webp`]),
        ...(avatarFilename ? [avatarFilename] : [`${mem.id}-avatar.jpg`, `${mem.id}-avatar.jpeg`, `${mem.id}-avatar.png`, `${mem.id}-avatar.webp`]),
      ]
      try { await supabase.storage.from('member-photos').remove(photoPaths) } catch {}
      try { await supabase.auth.admin.deleteUser(mem.id) } catch {}
    }
  }

  return Response.json({ success: true })
}
