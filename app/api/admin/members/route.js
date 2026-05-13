import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('members').select('*').order('join_date', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { name, email, membership_status = 'pending' } = await request.json()
  if (!email?.trim()) return Response.json({ error: 'Email required.' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { name },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/members/reset-password`,
  })
  if (inviteErr) return Response.json({ error: inviteErr.message }, { status: 400 })

  const { error: insertErr } = await supabase.from('members').insert({
    id: invited.user.id,
    name: name || null,
    email,
    membership_status,
  })
  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 })

  return Response.json({ success: true })
}
