import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { WTET_LUNCH_DEFAULT_CUTOFF, normalizeWtetLunch, isWtetEventName } from '../../../../lib/wtetRegistrationContent'
import { normalizeEventName } from '../../../../lib/eventMeta'

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()

  const [{ data: apps, error }, { data: cutoffSetting }] = await Promise.all([
    supabase.from('applications')
      .select('id, name, email, phone, car_year, car_make, car_model, stripe_payment_status, stripe_payment_type, registrations, wtet_checkin, wtet_waiver, wtet_lunch, created_at')
      .order('name', { ascending: true }),
    supabase.from('settings').select('value').eq('key', 'wtet_lunch_cutoff').maybeSingle(),
  ])
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Real Stripe registrations are gated on payment status; anyone else with a
  // registrations[] entry for this event (admin-manually added, member-portal
  // payment, or an older RSVP-confirmed invite that predates the admin_manual
  // source tag) counts as long as they're registered for this event at all —
  // don't require a specific `source` value, since historical entries don't
  // all have one.
  const participants = (apps || [])
    .filter(a => {
      const isStripeWtet = a.stripe_payment_type === 'road_trip_wtet' && ['paid', 'authorized'].includes(a.stripe_payment_status)
      const isManualWtet = (a.registrations || []).some(r => isWtetEventName(normalizeEventName(r.event)))
      return isStripeWtet || isManualWtet
    })
    .map(a => ({ ...a, wtet_lunch: normalizeWtetLunch(a.wtet_lunch) }))

  return Response.json({
    participants,
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
