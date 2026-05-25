import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()

  const { data: contacts, error: contactsErr } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false })
  if (contactsErr) return Response.json({ error: contactsErr.message }, { status: 500 })

  if (!contacts || contacts.length === 0) return Response.json([])

  const appIds = contacts.map(c => c.application_id)
  const { data: applications, error: appsErr } = await supabase
    .from('applications')
    .select('*')
    .in('id', appIds)
  if (appsErr) return Response.json({ error: appsErr.message }, { status: 500 })

  const appMap = Object.fromEntries((applications || []).map(a => [a.id, a]))
  const merged = contacts.map(c => ({
    ...(appMap[c.application_id] || {}),
    contact_id: c.id,
    application_id: c.application_id,
    contact_created_at: c.created_at,
  }))

  const { data: members } = await supabase.from('members').select('email')
  const memberEmails = new Set((members || []).map(m => m.email?.toLowerCase()))
  const withInvited = merged.map(c => ({ ...c, is_invited: memberEmails.has((c.email || '').toLowerCase()) }))
  return Response.json(withInvited)
}

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { application_id } = await request.json()
  if (!application_id) return Response.json({ error: 'application_id required' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('contacts').insert({ application_id })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
