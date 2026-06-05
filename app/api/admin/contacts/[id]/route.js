import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'

export async function PATCH(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const body = await request.json()
  const { email } = body
  const supabase = createAdminClient()

  const ALLOWED = ['notes', 'name', 'phone', 'instagram', 'car_year', 'car_make', 'car_model', 'admin_notes']
  const update = {}
  ALLOWED.forEach(k => { if (body[k] !== undefined) update[k] = body[k] })
  if (Object.keys(update).length === 0) return Response.json({ error: 'No valid fields to update' }, { status: 400 })

  // Update contacts row with filtered fields
  const { error: updateErr } = await supabase.from('contacts').update(update).eq('id', id)
  if (updateErr) return Response.json({ error: process.env.NODE_ENV === 'development' ? updateErr.message : 'Database error' }, { status: 500 })

  // Sync notes to members directly by email — no application lookup needed
  if (email && 'notes' in update) {
    const { data: mem } = await supabase.from('members').select('id').eq('email', email.toLowerCase().trim()).maybeSingle()
    if (mem) await supabase.from('members').update({ notes: update.notes ?? null }).eq('id', mem.id)
  }

  return Response.json({ success: true })
}

export async function DELETE(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  return Response.json({ success: true })
}
