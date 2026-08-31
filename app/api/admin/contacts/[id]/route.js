import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { captureMessage } from '../../../../../lib/sentry.js'
import { isValidEmail } from '../../../../../lib/emailValidation'

export async function PATCH(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const body = await request.json()
  const supabase = createAdminClient()

  const CONTACT_FIELDS = ['notes']
  const APP_FIELDS = ['name', 'phone', 'instagram', 'car_year', 'car_make', 'car_model', 'car_paint', 'admin_notes', 'dob_month', 'dob_day', 'dob_year', 'source', 'more']
  const contactUpdate = {}
  const appUpdate = {}
  CONTACT_FIELDS.forEach(k => { if (body[k] !== undefined) contactUpdate[k] = body[k] })
  APP_FIELDS.forEach(k => { if (body[k] !== undefined) appUpdate[k] = body[k] })

  // `body.email` here means "the admin's edited value for this contact's
  // email" — resolve the linked application's CURRENT email first so we can
  // tell whether it actually changed, validate/dedupe, and know the OLD email
  // for the member/auth/event_registrations sync below.
  const wantsEmailChange = 'email' in body
  if (wantsEmailChange && !body.email?.trim()) {
    return Response.json({ error: 'Email is required.' }, { status: 400 })
  }

  if (Object.keys(contactUpdate).length === 0 && Object.keys(appUpdate).length === 0 && !wantsEmailChange) {
    return Response.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Update contacts table
  if (Object.keys(contactUpdate).length > 0) {
    const { error: contactErr } = await supabase.from('contacts').update(contactUpdate).eq('id', id)
    if (contactErr) return Response.json({ error: process.env.NODE_ENV === 'development' ? contactErr.message : 'Database error' }, { status: 500 })
  }

  // Update applications table via application_id; also resolve email for member sync.
  // A quick-note edit must reach applications.notes too, and an email edit
  // needs the linked application's id regardless of other fields, so resolve
  // the link whenever any of those apply — not only for appUpdate fields.
  let appEmail = null
  let oldEmail = null
  let newEmail = null
  if (Object.keys(appUpdate).length > 0 || 'notes' in contactUpdate || wantsEmailChange) {
    const { data: contact, error: lookupErr } = await supabase.from('contacts').select('application_id').eq('id', id).single()
    if (lookupErr || !contact?.application_id) return Response.json({ error: 'Contact not found' }, { status: 404 })

    const { data: appRow } = await supabase.from('applications').select('email').eq('id', contact.application_id).maybeSingle()
    oldEmail = appRow?.email?.toLowerCase().trim() || null

    const fullAppUpdate = { ...appUpdate, ...('notes' in contactUpdate ? { notes: contactUpdate.notes ?? null } : {}) }
    if (wantsEmailChange) {
      newEmail = body.email.trim().toLowerCase()
      if (!isValidEmail(newEmail)) return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
      if (newEmail !== oldEmail) {
        const { data: dupe } = await supabase.from('applications').select('id').eq('email', newEmail).neq('id', contact.application_id).maybeSingle()
        if (dupe) return Response.json({ error: 'That email is already used by another application.' }, { status: 400 })
        fullAppUpdate.email = newEmail
      }
    }

    if (Object.keys(fullAppUpdate).length > 0) {
      const { error: appErr } = await supabase.from('applications').update(fullAppUpdate).eq('id', contact.application_id)
      if (appErr) return Response.json({ error: process.env.NODE_ENV === 'development' ? appErr.message : 'Database error' }, { status: 500 })
    }

    appEmail = (newEmail && newEmail !== oldEmail) ? newEmail : oldEmail
  }

  // Sync to members table: notes/admin_notes (when explicitly provided), plus name/phone/instagram on profile edits
  const memberSync = {}
  if (appEmail && 'notes' in contactUpdate) memberSync.notes = contactUpdate.notes ?? null
  if ('admin_notes' in appUpdate) memberSync.admin_notes = appUpdate.admin_notes ?? null
  if ('name' in appUpdate) memberSync.name = appUpdate.name
  if ('phone' in appUpdate) memberSync.phone = appUpdate.phone
  if ('instagram' in appUpdate) memberSync.instagram = appUpdate.instagram

  // Member is still stored under the OLD email until the sync below runs —
  // look them up by that, not by the (possibly just-changed) new one.
  const emailChanged = !!(newEmail && oldEmail && newEmail !== oldEmail)
  if ((Object.keys(memberSync).length > 0 || emailChanged) && oldEmail) {
    const { data: mem } = await supabase.from('members').select('id').eq('email', oldEmail).maybeSingle()
    if (mem) {
      if (Object.keys(memberSync).length > 0) {
        const { error: syncErr } = await supabase.from('members').update(memberSync).eq('id', mem.id)
        if (syncErr) captureMessage('Contact→member field sync failed', { error: syncErr.message, contactId: id, memberId: mem.id })
      }
      // If email changed, the member's login email, members.email, and any
      // event_registrations rows must follow too — those are keyed by email,
      // not by this contact's id.
      if (emailChanged) {
        const { error: authErr } = await supabase.auth.admin.updateUserById(mem.id, { email: newEmail })
        if (authErr) captureMessage('Contact email edit: auth email sync failed', { error: authErr.message, contactId: id, memberId: mem.id })
        else {
          const { error: memErr } = await supabase.from('members').update({ email: newEmail }).eq('id', mem.id)
          if (memErr) captureMessage('Contact email edit: members.email sync failed', { error: memErr.message, contactId: id, memberId: mem.id })
        }
      }
    }
  }
  if (emailChanged) {
    const { error: regEmailErr } = await supabase.from('event_registrations').update({ email: newEmail }).eq('email', oldEmail)
    if (regEmailErr) captureMessage('Contact email edit: event_registrations sync failed', { error: regEmailErr.message, oldEmail })
  }

  return Response.json({ success: true })
}

// "Remove Contact" un-lists someone from the CRM contacts view — it must
// NEVER delete their underlying application. This used to delete the
// applications row (which cascades to contacts via FK), silently destroying
// their entire registration and payment history any time an admin clicked
// what the UI calls "Remove this contact?" — a full application purge is a
// separate, explicitly-labeled action on the Applications page ("Delete
// application from {name}?"), not something this button should ever do as
// a side effect of its own, much lighter-sounding label.
export async function DELETE(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  return Response.json({ success: true })
}
