import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const admin = createAdminClient()
    const { data: member } = await admin.from('members').select('id, name, email, phone, instagram, car_year, car_make, car_model, cars, dob_month, dob_day, dob_year, membership_status, tier, join_date, car_photo_url, password_set_at').eq('id', user.id).maybeSingle()
    return Response.json({ user: { id: user.id, email: user.email }, member: member || null })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
