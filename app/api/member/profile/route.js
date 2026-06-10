import { createClient } from '../../../../lib/supabase/server'
import { createAdminClient } from '../../../../lib/supabase/admin'

export async function PATCH(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const allowed = ['name', 'phone', 'instagram', 'car_year', 'car_make', 'car_model', 'dob_day', 'dob_month', 'dob_year', 'cars', 'car_photo_url']
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
  const admin = createAdminClient()
  const { error, count } = await admin.from('members').update({ ...update }, { count: 'exact' }).eq('id', user.id)
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  if (count === 0) return Response.json({ error: 'Member not found' }, { status: 404 })
  return Response.json({ success: true })
}
