import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'

export async function GET(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('admin_activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  return Response.json(data || [])
}

export async function POST(request) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json()
  if (!body.action) return Response.json({ error: 'action is required' }, { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase.from('admin_activity_log').insert({
    action: body.action,
    entity_type: body.entity_type || null,
    entity_id: body.entity_id ? String(body.entity_id) : null,
    entity_name: body.entity_name || null,
    admin_email: admin.email,
    metadata: body.metadata || {},
  })
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  return Response.json({ success: true })
}
