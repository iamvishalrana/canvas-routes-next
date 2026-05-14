import { createClient } from '../../../../lib/supabase/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  if (!code) return Response.json({ error: 'No code provided.' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return Response.json({ error: error.message }, { status: 400 })
  if (!data.session?.access_token) return Response.json({ error: 'No session returned.' }, { status: 400 })

  return Response.json({ token: data.session.access_token })
}
