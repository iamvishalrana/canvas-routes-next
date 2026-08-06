import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureException } from '../../../../lib/sentry'

// The unsubscribed_emails table had no admin-facing view at all before this —
// the only way to check it was a direct SQL query in the Supabase dashboard.
export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('unsubscribed_emails').select('email, unsubscribed_at').order('unsubscribed_at', { ascending: false })
  if (error) {
    captureException(error, { context: 'admin-unsubscribes-list' })
    return Response.json({ error: 'Could not load unsubscribes.' }, { status: 500 })
  }
  return Response.json(data || [])
}

// Lets an admin manually resubscribe someone (e.g. they unsubscribed by
// mistake, or ask to be added back) without needing SQL Editor access.
export async function DELETE(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { email } = await request.json().catch(() => ({}))
  if (!email?.trim()) return Response.json({ error: 'Email required.' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('unsubscribed_emails').delete().eq('email', email.toLowerCase().trim())
  if (error) {
    captureException(error, { context: 'admin-unsubscribes-delete' })
    return Response.json({ error: 'Could not remove.' }, { status: 500 })
  }
  return Response.json({ success: true })
}
