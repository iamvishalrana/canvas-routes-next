import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'

export async function PATCH(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const body = await request.json()
  const { email } = body
  const supabase = createAdminClient()

  const CONTACT_FIELDS = ['notes', 'admin_notes']
  const APP_FIELDS = ['name', 'phone', 'instagram', 'car_year', 'car_make', 'car_model', 'car_paint']
  const contactUpdate = {}
  const appUpdate = {}
  CONTACT_FIELDS.forEach(k => { if (body[k] !== undefined) contactUpdate[k] = body[k] })
  APP_FIELDS.forEach(k => { if (body[k] !== undefined) appUpdate[k] = body[k] })

  if (Object.keys(contactUpdate).length === 0 && Object.keys(appUpdate).length === 0) {
    return Response.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Update contacts table
  if (Object.keys(contactUpdate).length > 0) {
    const { error: contactErr } = await supabase.from('contacts').update(contactUpdate).eq('id', id)
    if (contactErr) return Response.json({ error: process.env.NODE_ENV === 'development' ? contactErr.message : 'Database error' }, { status: 500 })
  }

  // Update applications table via application_id
  if (Object.keys(appUpdate).length > 0) {
    const { data: contact, error: lookupErr } = await supabase.from('contacts').select('application_id').eq('id', id).single()
    if (lookupErr || !contact?.application_id) return Response.json({ error: 'Contact not found' }, { status: 404 })
    const { error: appErr } = await supabase.from('applications').update(appUpdate).eq('id', contact.application_id)
    if (appErr) return Response.json({ error: process.env.NODE_ENV === 'development' ? appErr.message : 'Database error' }, { status: 500 })
  }

  // Sync notes to members directly by email — no application lookup needed
  if (email && 'notes' in contactUpdate) {
    const { data: mem } = await supabase.from('members').select('id').eq('email', email.toLowerCase().trim()).maybeSingle()
    if (mem) await supabase.from('members').update({ notes: contactUpdate.notes ?? null }).eq('id', mem.id)
  }

  return Response.json({ success: true })
}

export async function DELETE(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()

  // Fetch application_id before deleting
  const { data: contact } = await supabase.from('contacts').select('application_id').eq('id', id).maybeSingle()
  if (!contact) return Response.json({ error: 'Contact not found' }, { status: 404 })

  if (contact.application_id) {
    // Delete application row — cascades to contacts via FK
    const { error } = await supabase.from('applications').delete().eq('id', contact.application_id)
    if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  } else {
    // No linked application — delete contact directly
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  }

  return Response.json({ success: true })
}
