import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'

const SETTINGS_KEY = 'broadcast_templates'

async function getTemplates(supabase) {
  const { data } = await supabase.from('settings').select('value').eq('key', SETTINGS_KEY).maybeSingle()
  try { return data?.value ? JSON.parse(data.value) : [] } catch { return [] }
}

export async function GET(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError
  const supabase = createAdminClient()
  return Response.json(await getTemplates(supabase))
}

export async function POST(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError
  const { name, subject, bodyHtml } = await request.json().catch(() => ({}))
  if (!name?.trim()) return Response.json({ error: 'Name is required.' }, { status: 400 })
  if (!subject?.trim()) return Response.json({ error: 'Subject is required.' }, { status: 400 })
  const supabase = createAdminClient()
  const templates = await getTemplates(supabase)
  const newTemplate = {
    id: crypto.randomUUID(),
    name: name.trim(),
    subject: subject.trim(),
    bodyHtml: bodyHtml || '',
    createdAt: new Date().toISOString(),
  }
  templates.push(newTemplate)
  await supabase.from('settings').upsert({ key: SETTINGS_KEY, value: JSON.stringify(templates) }, { onConflict: 'key' })
  return Response.json(newTemplate)
}

export async function DELETE(request) {
  const authError = await requireAdmin(request)
  if (authError) return authError
  const { id } = await request.json().catch(() => ({}))
  if (!id) return Response.json({ error: 'ID required.' }, { status: 400 })
  const supabase = createAdminClient()
  const templates = (await getTemplates(supabase)).filter(t => t.id !== id)
  await supabase.from('settings').upsert({ key: SETTINGS_KEY, value: JSON.stringify(templates) }, { onConflict: 'key' })
  return Response.json({ ok: true })
}
