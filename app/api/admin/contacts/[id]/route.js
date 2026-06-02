import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'

export async function PATCH(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const { notes } = await request.json()
  const supabase = createAdminClient()

  // Step 1: update contacts.notes
  const { error: updateErr } = await supabase.from('contacts').update({ notes: notes ?? null }).eq('id', id)
  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 })

  // Step 2: get the linked application_id
  const { data: contact } = await supabase.from('contacts').select('application_id').eq('id', id).single()
  if (!contact?.application_id) return Response.json({ ok: true })

  // Step 3: get email from application
  const { data: app } = await supabase.from('applications').select('email').eq('id', contact.application_id).single()
  if (!app?.email) return Response.json({ ok: true })

  // Step 4: sync to members.notes
  const { data: mem } = await supabase.from('members').select('id').eq('email', app.email.toLowerCase().trim()).maybeSingle()
  if (mem) await supabase.from('members').update({ notes: notes ?? null }).eq('id', mem.id)

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
