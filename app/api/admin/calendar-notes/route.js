import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureException } from '../../../../lib/sentry'
import { logAdminAction } from '../../../../lib/adminAudit.js'

// Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD range, for a future caller that
// wants just one month instead of the full history. Both the calendar page
// and the .ics feed currently omit them and fetch everything — note volume
// for a single admin is small enough that this hasn't been worth doing yet.
export async function GET(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const supabase = createAdminClient()
  let query = supabase.from('admin_calendar_notes').select('*').order('note_date', { ascending: true })
  if (from) query = query.gte('note_date', from)
  if (to) query = query.lte('note_date', to)
  const { data, error } = await query
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  return Response.json(data || [])
}

export async function POST(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }

  const { note_date, content } = body
  if (!note_date || !/^\d{4}-\d{2}-\d{2}$/.test(note_date)) return Response.json({ error: 'Valid date is required.' }, { status: 400 })
  const trimmed = (content || '').trim()
  if (!trimmed) return Response.json({ error: 'Note text is required.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('admin_calendar_notes').insert({
    note_date,
    content: trimmed.slice(0, 2000),
    created_by: adminUser.email || null,
  }).select('*').single()

  if (error) {
    captureException(error, { context: 'admin-calendar-notes-insert' })
    return Response.json({ error: error.message }, { status: 500 })
  }
  await logAdminAction(supabase, adminUser?.email, {
    action: 'calendar_note.create', entityType: 'calendar_note', entityId: data.id,
    entityName: note_date, metadata: { note_date },
  })
  return Response.json(data)
}
