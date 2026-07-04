import { createAdminClient } from '../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../lib/supabase/authCheck'

// Waiver saves are immutable by design (legal document), so a typo in the
// signature or vehicle info has no self-serve fix — this lets an admin clear
// it so the participant can sign again from /wtet/checkin.
export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const { id } = body || {}
  if (!id) return Response.json({ error: 'Missing id.' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('applications').update({ wtet_waiver: null }).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
