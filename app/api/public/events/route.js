import { createAdminClient } from '../../../../lib/supabase/admin'

export async function GET() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('events')
    .select('id, name, date, location, description, type, registration_url')
    .order('date', { ascending: false })
  if (error) return Response.json([], { status: 200 })
  return Response.json(data || [])
}
