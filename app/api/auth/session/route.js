import { createClient } from '../../../../lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return Response.json({ error: 'No session' }, { status: 401 })
  return Response.json({ access_token: session.access_token })
}
