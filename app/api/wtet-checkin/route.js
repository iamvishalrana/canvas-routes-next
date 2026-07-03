import { after } from 'next/server'
import { createAdminClient } from '../../../lib/supabase/admin.js'
import { captureException } from '../../../lib/sentry.js'
import { buildAdminNotifyHtml } from '../../../lib/adminEmail.js'
import { WTET_EVENT_NAME, WTET_LUNCH_OPTIONS, WTET_LUNCH_DEFAULT_CUTOFF, normalizeWtetLunch } from '../../../lib/wtetRegistrationContent.js'
import { normalizeEventName } from '../../../lib/eventMeta.js'

export const runtime = 'nodejs'

// GET ?t=pi_xxx — look up application by stripe_payment_intent_id. This is the
// same token already emailed in the "Complete Early Check-in" button, so it now
// also carries the waiver + lunch sections — one link, one page, all three items.
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('t')
  if (!token) return Response.json({ error: 'Missing token' }, { status: 400 })

  const supabase = createAdminClient()
  const [{ data, error }, { data: cutoffSetting }] = await Promise.all([
    supabase
      .from('applications')
      .select('name, email, passengers, car_year, car_make, car_model, wtet_checkin, wtet_waiver, wtet_lunch, stripe_payment_status')
      .eq('stripe_payment_intent_id', token)
      .in('stripe_payment_status', ['paid', 'authorized'])
      .maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'wtet_lunch_cutoff').maybeSingle(),
  ])

  if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 })

  const cutoff = cutoffSetting?.value || WTET_LUNCH_DEFAULT_CUTOFF

  return Response.json({
    name:             data.name,
    email:            data.email,
    passengers:       data.passengers || '1',
    alreadyCompleted: !!data.wtet_checkin,
    carYear:          data.car_year || '',
    carMake:          data.car_make || '',
    carModel:         data.car_model || '',
    eventName:        WTET_EVENT_NAME,
    waiver:           data.wtet_waiver || null,
    lunch:            normalizeWtetLunch(data.wtet_lunch),
    lunchOptions:     WTET_LUNCH_OPTIONS,
    lunchCutoff:      cutoff,
    lunchLocked:      new Date() > new Date(cutoff),
  })
}

// POST body: { token?, email?, dietary, whatsapp, passengers_list } — needs one of token/email
export async function POST(request) {
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { token, dietary, whatsapp, passengers_list } = body || {}
  const normalEmail = (body?.email || '').toLowerCase().trim()
  if (!token && !normalEmail) return Response.json({ error: 'Missing token' }, { status: 400 })

  // Validate passengers_list
  if (!Array.isArray(passengers_list) || passengers_list.length === 0) {
    return Response.json({ error: 'At least one passenger (the driver) is required.' }, { status: 400 })
  }
  if (passengers_list.length > 2) {
    return Response.json({ error: 'Maximum 2 people per car. Email jerry@canvasroutes.com if you need to bring more than 2.' }, { status: 400 })
  }
  for (const p of passengers_list) {
    if (!p.name?.trim()) return Response.json({ error: 'Please provide a name for each passenger.' }, { status: 400 })
    const ageNum = parseInt(p.age)
    if (!p.age?.toString().trim() || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return Response.json({ error: 'Please provide a valid age (1–120) for each passenger.' }, { status: 400 })
    }
  }

  const supabase = createAdminClient()

  let appQuery = supabase.from('applications').select('id, name, email, wtet_checkin, stripe_payment_type, stripe_payment_status, registrations')
  appQuery = token ? appQuery.eq('stripe_payment_intent_id', token) : appQuery.eq('email', normalEmail)
  const { data, error: lookupErr } = await appQuery.maybeSingle()

  // Real Stripe registrations are gated on payment status; admin-manually-added
  // registrants (cash/e-transfer/comped) have no Stripe hold, so they're valid
  // as long as an admin added them as a registrant for this event.
  const isStripeWtet = data?.stripe_payment_type === 'road_trip_wtet' && ['paid', 'authorized'].includes(data?.stripe_payment_status)
  const isManualWtet = (data?.registrations || []).some(r => r.source === 'admin_manual' && normalizeEventName(r.event) === WTET_EVENT_NAME)
  if (lookupErr || !data || (!isStripeWtet && !isManualWtet)) return Response.json({ error: 'Not found' }, { status: 404 })
  if (data.wtet_checkin) return Response.json({ error: 'Already completed.' }, { status: 400 })

  const cleanedPassengers = passengers_list.map(p => ({ name: p.name.trim(), age: p.age.toString().trim() }))

  const { error: updateErr } = await supabase
    .from('applications')
    .update({
      wtet_checkin: {
        dietary:         dietary || null,
        whatsapp:        whatsapp || null,
        passengers_list: cleanedPassengers,
        completed_at:    new Date().toISOString(),
      },
    })
    .eq('id', data.id)

  if (updateErr) return Response.json({ error: 'Failed to save' }, { status: 500 })

  // Notify Jerry — after() keeps the function alive until the fetch settles without blocking the response.
  if (process.env.RESEND_API_KEY) {
    after(() => {
      return fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Canvas Routes <info@canvasroutes.com>',
          to: 'jerry@canvasroutes.com',
          subject: `Check-in Completed — ${data.name || 'Registrant'}`,
          html: buildAdminNotifyHtml('Whips to Eastern Townships — Early check-in', [
            ['Name',       `<strong>${data.name || '—'}</strong>`],
            ['Email',      `<a href="mailto:${data.email}" style="color:#1a1a1a;">${data.email || '—'}</a>`],
            ['Dietary',    dietary || 'None'],
            ['WhatsApp',   whatsapp || 'Not provided'],
            ['Passengers', cleanedPassengers.map((p, i) => `${i === 0 ? 'Driver' : `Passenger ${i + 1}`}: ${p.name}, age ${p.age}`).join('<br>')],
          ]),
        }),
      }).catch(err => captureException(err, { context: 'wtet-checkin-notify-jerry', token }))
    })
  }

  return Response.json({ success: true })
}
