import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { WTET_LUNCH_DEFAULT_CUTOFF } from '../../../../lib/wtetRegistrationContent'

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()

  const [{ data: apps, error }, { data: cutoffSetting }] = await Promise.all([
    supabase.from('applications')
      .select('id, name, email, phone, car_year, car_make, car_model, stripe_payment_status, wtet_waiver, wtet_lunch, created_at')
      .eq('stripe_payment_type', 'road_trip_wtet')
      .in('stripe_payment_status', ['paid', 'authorized'])
      .order('name', { ascending: true }),
    supabase.from('settings').select('value').eq('key', 'wtet_lunch_cutoff').maybeSingle(),
  ])
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({
    participants: apps || [],
    lunchCutoff: cutoffSetting?.value || WTET_LUNCH_DEFAULT_CUTOFF,
  })
}

export async function PATCH(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const { lunchCutoff } = body || {}
  if (!lunchCutoff || isNaN(new Date(lunchCutoff).getTime())) {
    return Response.json({ error: 'Invalid date.' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { error } = await supabase.from('settings').upsert(
    { key: 'wtet_lunch_cutoff', value: new Date(lunchCutoff).toISOString(), updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
