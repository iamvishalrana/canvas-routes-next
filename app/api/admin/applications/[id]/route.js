import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'

export async function PATCH(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const body = await request.json()
  const supabase = createAdminClient()
  const ALLOWED = ['name', 'car_year', 'car_model', 'car_paint', 'phone', 'instagram',
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
    if ('car_year' in body) memberSync.car_year = body.car_year || null
    if ('car_model' in body) memberSync.car_model = body.car_model || null
    if (Object.keys(memberSync).length > 0) {
      const { data: mem } = await supabase.from('members').select('id').eq('email', app.email.toLowerCase()).maybeSingle()
      if (mem) await supabase.from('members').update(memberSync).eq('id', mem.id)
    }
  }

  return Response.json({ success: true })
}

export async function DELETE(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase.from('applications').delete().eq('id', id)
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  return Response.json({ success: true })
}
