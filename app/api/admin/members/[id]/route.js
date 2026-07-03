import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { attendanceKey, attendanceKeyToEventName, normalizeEventName } from '../../../../../lib/eventMeta.js'
import { captureException } from '../../../../../lib/sentry.js'

export async function PATCH(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const body = await request.json()
  const supabase = createAdminClient()

  // Capture old email BEFORE any update so we can find the applications row later
  const { data: memberBefore, error: memberLookupErr } = await supabase.from('members').select('email').eq('id', id).maybeSingle()
  if (memberLookupErr || !memberBefore) return Response.json({ error: 'Member not found.' }, { status: 404 })
  const oldEmail = memberBefore.email?.toLowerCase().trim()

  if (body.email) {
    const newEmail = body.email.trim().toLowerCase()
    const { error: authErr } = await supabase.auth.admin.updateUserById(id, { email: newEmail })
    if (authErr) return Response.json({ error: process.env.NODE_ENV === 'development' ? authErr.message : 'Database error' }, { status: 500 })
  }

  // Check for duplicate membership number if being set
  if (body.membership_number && String(body.membership_number).trim() !== '') {
    const { data: existing } = await supabase
      .from('members')
      .select('id, name, email')
      .eq('membership_number', String(body.membership_number).trim())
      .neq('id', id)
      .maybeSingle()
    if (existing) {
      const who = existing.name || existing.email || 'another member'
      return Response.json({ error: `Membership number ${body.membership_number} is already assigned to ${who}.` }, { status: 400 })
    }
  }

  // car_paint is not a column on members — it lives on applications (synced below)
  const allowed = ['membership_status', 'tier', 'name', 'email', 'phone', 'instagram', 'car_year', 'car_make', 'car_model', 'dob_day', 'dob_month', 'dob_year', 'cars', 'event_attendance', 'admin_notes', 'notes', 'membership_number']
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
  if (Object.keys(update).length === 0) return Response.json({ error: 'No valid fields to update' }, { status: 400 })
  if (update.email) update.email = update.email.trim().toLowerCase()

  const { error } = await supabase.from('members').update(update).eq('id', id)
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })

  // Sync shared fields to applications table
  const newEmail = update.email || null
  const memberEmail = newEmail || oldEmail
  if (memberEmail) {
    const appSync = {}
    if ('name' in body) appSync.name = body.name?.trim() || null
    if ('phone' in body) appSync.phone = body.phone || null
    if ('instagram' in body) appSync.instagram = body.instagram || null
    if ('dob_month' in body) appSync.dob_month = body.dob_month ?? null
    if ('dob_day' in body) appSync.dob_day = body.dob_day ?? null
    if ('dob_year' in body) appSync.dob_year = body.dob_year ?? null
    if ('notes' in body) appSync.notes = body.notes ?? null
    if ('admin_notes' in body) appSync.admin_notes = body.admin_notes ?? null
    if ('cars' in body || 'car_year' in body || 'car_make' in body || 'car_model' in body) {
      const primary = (body.cars || [])[0] || {}
      if (primary.year || body.car_year) appSync.car_year = primary.year || body.car_year || null
      const combined = [primary.make || body.car_make, primary.model || body.car_model].filter(Boolean).join(' ')
      if (combined) appSync.car_model = combined
      appSync.car_make = primary.make || body.car_make || null
      if ('paint' in primary || 'car_paint' in body) appSync.car_paint = primary.paint || body.car_paint || null
    }
    // If email changed, update applications.email and use the old email to find the row
    if (newEmail && oldEmail && newEmail !== oldEmail) appSync.email = newEmail
    if (Object.keys(appSync).length > 0) {
      const { error: appSyncErr } = await supabase.from('applications').update(appSync).eq('email', oldEmail || memberEmail)
      if (appSyncErr) captureException(appSyncErr, { context: 'member-patch-sync-to-applications', email: oldEmail || memberEmail })
    }

    // If email changed, event_registrations rows keyed by the old email must
    // follow too — they join to the registrants list by email, not by FK
    if (newEmail && oldEmail && newEmail !== oldEmail) {
      const { error: regEmailErr } = await supabase.from('event_registrations').update({ email: newEmail }).eq('email', oldEmail)
      if (regEmailErr) captureException(regEmailErr, { context: 'member-patch-sync-event-registrations-email', oldEmail })
    }

    // Sync event_attendance → applications.registrations[].attended
    if ('event_attendance' in body) {
      const newAttendance = body.event_attendance || {}
      const { data: app } = await supabase.from('applications').select('id, registrations').eq('email', memberEmail).maybeSingle()
      if (app) {
        const regs = [...(app.registrations || [])]
        let changed = false
        // Update existing registration entries — attendanceKey() is total, so
        // every event syncs, not just the four legacy short-key events
        const updatedRegs = regs.map(reg => {
          const key = attendanceKey(reg.event)
          if (key in newAttendance && newAttendance[key] !== reg.attended) {
            changed = true
            return { ...reg, attended: newAttendance[key] }
          }
          return reg
        })
        // Create placeholder entries for keys not yet in registrations (non-null values only)
        for (const [key, attended] of Object.entries(newAttendance)) {
          if (attended === null) continue
          const eventName = attendanceKeyToEventName(key)
          const exists = updatedRegs.some(r => normalizeEventName(r.event) === eventName)
          if (!exists) { updatedRegs.push({ event: eventName, registered_at: null, attended }); changed = true }
        }
        if (changed) {
          const { error: regSyncErr } = await supabase.from('applications').update({ registrations: updatedRegs }).eq('id', app.id)
          if (regSyncErr) captureException(regSyncErr, { context: 'member-patch-sync-attendance', appId: app.id })
        }
      }
    }

    // Sync notes to contacts.notes — use memberEmail (new email if changed, applications is now updated)
    if ('notes' in body) {
      const noteVal = body.notes ?? null
      const { data: app } = await supabase.from('applications').select('id').eq('email', memberEmail).maybeSingle()
      if (app?.id) {
        const { data: contact } = await supabase.from('contacts').select('id').eq('application_id', app.id).maybeSingle()
        if (contact?.id) {
          const { error: noteSyncErr } = await supabase.from('contacts').update({ notes: noteVal }).eq('id', contact.id)
          if (noteSyncErr) captureException(noteSyncErr, { context: 'member-patch-sync-notes', contactId: contact.id })
        }
      }
    }
  }

  return Response.json({ success: true })
}

export async function DELETE(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const supabase = createAdminClient()

  // Fetch email and photo URL before any deletion
  const { data: member } = await supabase.from('members').select('email, car_photo_url, profile_photo_url').eq('id', id).maybeSingle()

  // Delete auth user — cascade-deletes the members row via FK
  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })

  // Delete profile photo from storage
  const photoFilename = member?.car_photo_url?.split('/').pop()?.split('?')[0]
  const avatarFilename = member?.profile_photo_url?.split('/').pop()?.split('?')[0]
  const photoPaths = [
    ...(photoFilename ? [photoFilename] : [`${id}.jpg`, `${id}.jpeg`, `${id}.png`, `${id}.webp`]),
    ...(avatarFilename ? [avatarFilename] : [`${id}-avatar.jpg`, `${id}-avatar.jpeg`, `${id}-avatar.png`, `${id}-avatar.webp`]),
  ]
  try { await supabase.storage.from('member-photos').remove(photoPaths) } catch {}

  // Delete application row by email — cascades to contacts
  if (member?.email) {
    const { error: appDelErr } = await supabase.from('applications').delete().eq('email', member.email.toLowerCase().trim())
    if (appDelErr) captureException(appDelErr, { context: 'member-delete-application-cleanup', email: member.email })
  }

  return Response.json({ success: true })
}
