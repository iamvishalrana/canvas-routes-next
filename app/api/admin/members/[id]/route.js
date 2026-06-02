import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'

export async function PATCH(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const body = await request.json()
  const supabase = createAdminClient()

  if (body.email) {
    const newEmail = body.email.trim().toLowerCase()
    const { error: authErr } = await supabase.auth.admin.updateUserById(id, { email: newEmail })
    if (authErr) return Response.json({ error: authErr.message }, { status: 500 })
  }

  const allowed = ['membership_status', 'tier', 'name', 'email', 'phone', 'instagram', 'car_year', 'car_make', 'car_model', 'dob_day', 'dob_month', 'dob_year', 'cars', 'event_attendance', 'admin_notes', 'notes']
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
  if (update.email) update.email = update.email.trim().toLowerCase()

  const { error } = await supabase.from('members').update(update).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Sync shared fields to applications table
  const { data: member } = await supabase.from('members').select('email').eq('id', id).single()
  const memberEmail = (update.email || member?.email)?.toLowerCase().trim()
  if (memberEmail) {
    const appSync = {}
    if ('name' in body) appSync.name = body.name?.trim() || null
    if ('phone' in body) appSync.phone = body.phone || null
    if ('instagram' in body) appSync.instagram = body.instagram || null
    if ('dob_month' in body) appSync.dob_month = body.dob_month ?? null
    if ('dob_day' in body) appSync.dob_day = body.dob_day ?? null
    if ('dob_year' in body) appSync.dob_year = body.dob_year ?? null
    if ('cars' in body || 'car_year' in body || 'car_make' in body || 'car_model' in body) {
      const primary = (body.cars || [])[0] || {}
      if (primary.year || body.car_year) appSync.car_year = primary.year || body.car_year || null
      const combined = [primary.make || body.car_make, primary.model || body.car_model].filter(Boolean).join(' ')
      if (combined) appSync.car_model = combined
    }
    if (Object.keys(appSync).length > 0) {
      await supabase.from('applications').update(appSync).eq('email', memberEmail)
    }

    // Sync notes to contacts.notes
    if ('notes' in body) {
      const noteVal = body.notes ?? null
      const { data: app } = await supabase.from('applications').select('id').eq('email', memberEmail).maybeSingle()
      if (app?.id) {
        const { data: contact } = await supabase.from('contacts').select('id').eq('application_id', app.id).maybeSingle()
        if (contact?.id) {
          await supabase.from('contacts').update({ notes: noteVal }).eq('id', contact.id)
        }
      }
    }
  }

  return Response.json({ success: true })
}

export async function DELETE(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
