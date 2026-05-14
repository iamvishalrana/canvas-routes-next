import { createClient } from '../../../../lib/supabase/server'

export async function POST(request) {
  const { email } = await request.json()
  if (!email?.trim()) return Response.json({ error: 'Email required.' }, { status: 400 })
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/members/reset-password`,
  })
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ success: true })
}
