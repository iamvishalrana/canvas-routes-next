import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'

export async function PATCH(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const { notes, email } = await request.json()
  const supabase = createAdminClient()

  // Update contacts.notes
  const { error: updateErr } = await supabase.from('contacts').update({ notes: notes ?? null }).eq('id', id)
  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 })

  // Sync to members directly by email — no application lookup needed
  if (email) {
    const { data: mem } = await supabase.from('members').select('id').eq('email', email.toLowerCase().trim()).maybeSingle()
    if (mem) await supabase.from('members').update({ notes: notes ?? null }).eq('id', mem.id)
  }

  return Response.json({ ok: true })
}

export async function DELETE(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
