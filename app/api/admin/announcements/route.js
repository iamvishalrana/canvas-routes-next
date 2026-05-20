import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { title, content, published = false, audience = 'all' } = await request.json()
  if (!title?.trim()) return Response.json({ error: 'Title required.' }, { status: 400 })
  if (!content?.trim()) return Response.json({ error: 'Content required.' }, { status: 400 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('announcements').insert({ title: title.trim(), content: content.trim(), published, audience }).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
