import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { getBirthdays } from '../../../../lib/adminBirthdays'

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()
  const birthdays = await getBirthdays(supabase)
  return Response.json(birthdays)
}
