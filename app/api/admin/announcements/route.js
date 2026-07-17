import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { logAdminAction } from '../../../../lib/adminAudit.js'
import { checkRateLimit } from '../../../../lib/rateLimit'

export async function GET(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
  if (await checkRateLimit(ip, 200, 60)) return Response.json({ error: 'Too many requests' }, { status: 429 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  return Response.json(data)
}

export async function POST(request) {
  const adminUser = await requireAdmin()
  if (!adminUser) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
  if (await checkRateLimit(ip, 200, 60)) return Response.json({ error: 'Too many requests' }, { status: 429 })
  const { title, content, published = false, audience = 'all' } = await request.json()
  if (!title?.trim()) return Response.json({ error: 'Title required.' }, { status: 400 })
  if (!content?.trim()) return Response.json({ error: 'Content required.' }, { status: 400 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('announcements').insert({ title: title.trim(), content: content.trim(), published, audience }).select().single()
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  await logAdminAction(supabase, adminUser?.email, { action: 'announcement.create', entityType: 'announcement', entityId: data.id, entityName: data.title, metadata: { published: !!published } })
  return Response.json(data)
}
