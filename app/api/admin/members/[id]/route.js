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
