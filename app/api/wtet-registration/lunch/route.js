import { createAdminClient } from '../../../../lib/supabase/admin'
import { checkRateLimit } from '../../../../lib/rateLimit'
import { captureException } from '../../../../lib/sentry'
import { WTET_LUNCH_OPTIONS, WTET_LUNCH_DEFAULT_CUTOFF } from '../../../../lib/wtetRegistrationContent'

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim() || 'unknown'
  if (await checkRateLimit(ip, 15, 60)) return Response.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
  const email = (body?.email || '').toLowerCase().trim()
  const dishId = body?.dishId
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  const dish = WTET_LUNCH_OPTIONS.find(d => d.id === dishId)
  if (!dish) return Response.json({ error: 'Please select a valid dish.' }, { status: 400 })

  const admin = createAdminClient()

  const [{ data: app, error: lookupErr }, { data: cutoffSetting }] = await Promise.all([
    admin.from('applications')
      .select('id')
      .eq('email', email)
      .eq('stripe_payment_type', 'road_trip_wtet')
      .in('stripe_payment_status', ['paid', 'authorized'])
      .maybeSingle(),
    admin.from('settings').select('value').eq('key', 'wtet_lunch_cutoff').maybeSingle(),
  ])
  if (lookupErr) {
    captureException(lookupErr, { context: 'wtet-lunch-lookup', email })
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
  if (!app) return Response.json({ error: 'No matching registration found.' }, { status: 404 })

  const cutoff = cutoffSetting?.value || WTET_LUNCH_DEFAULT_CUTOFF
  if (new Date() > new Date(cutoff)) {
    return Response.json({ error: 'The deadline to select or change your lunch choice has passed. Contact jerry@canvasroutes.com if you need to make a change.' }, { status: 400 })
  }

  const lunchRecord = { dish_id: dish.id, dish_name: dish.name, selected_at: new Date().toISOString() }
  const { error: updateErr } = await admin.from('applications')
    .update({ wtet_lunch: lunchRecord })
    .eq('id', app.id)
  if (updateErr) {
    captureException(updateErr, { context: 'wtet-lunch-save', email })
    return Response.json({ error: 'Failed to save. Please try again.' }, { status: 500 })
  }

  return Response.json({ success: true, lunch: lunchRecord })
}
