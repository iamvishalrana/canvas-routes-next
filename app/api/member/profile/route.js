import { createClient } from '../../../../lib/supabase/server'

export async function PATCH(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const allowed = ['name', 'phone', 'car_year', 'car_make', 'car_model', 'dob_day', 'dob_month', 'dob_year']
  const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
  const { error } = await supabase.from('members').update(update).eq('id', user.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
