import { requireAdmin } from '../../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { captureException } from '../../../../../lib/sentry'

export async function PATCH(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }

  const update = {}
  if ('note_date' in body) {
    if (!body.note_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.note_date)) return Response.json({ error: 'Valid date is required.' }, { status: 400 })
    update.note_date = body.note_date
  }
  if ('content' in body) {
    const trimmed = (body.content || '').trim()
    if (!trimmed) return Response.json({ error: 'Note text is required.' }, { status: 400 })
    update.content = trimmed.slice(0, 2000)
  }
  if (!Object.keys(update).length) return Response.json({ error: 'Nothing to update.' }, { status: 400 })
  update.updated_at = new Date().toISOString()

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('admin_calendar_notes').update(update).eq('id', id).select('*').single()
  if (error) {
    captureException(error, { context: 'admin-calendar-notes-patch', id })
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json(data)
}

export async function DELETE(request, { params }) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from('admin_calendar_notes').delete().eq('id', id)
  if (error) {
    captureException(error, { context: 'admin-calendar-notes-delete', id })
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ success: true })
}
