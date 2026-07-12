import { after } from 'next/server'
import { deviceType } from '../../../../lib/deviceType'
import { createAdminClient } from '../../../../lib/supabase/admin'
import { checkRateLimit } from '../../../../lib/rateLimit'
import { captureException } from '../../../../lib/sentry'
import { normalizeEmail } from '../../../../lib/normalizeEmail'
import { buildAdminNotifyHtml } from '../../../../lib/adminEmail'
import { buildRouteInterestHtml } from '../../../../lib/roadtripEmail'

function sendEmail(payload, context) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(err => captureException(err, { context }))
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (await checkRateLimit(ip, 10, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }

  if (body._hp) return Response.json({ success: true }) // honeypot — silently accept

  const slug = (body.slug || '').trim()
  const name = (body.name || '').trim()
  const email = normalizeEmail(body.email)
  const phone = (body.phone || '').trim()
  const car = (body.car || '').trim()
  const membershipOptin = !!body.membership_optin
  const isMember = !!body.is_member

  // Sanitize the trip-preference survey answers into a known shape.
  const pIn = body.preferences && typeof body.preferences === 'object' ? body.preferences : {}
  const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined)
  const preferences = {}
  if (str(pIn.budget, 60)) preferences.budget = str(pIn.budget, 60)
  if (str(pIn.dates, 120)) preferences.dates = str(pIn.dates, 120)
  if (str(pIn.hotel, 60)) preferences.hotel = str(pIn.hotel, 60)
  if (Array.isArray(pIn.activities)) {
    const acts = pIn.activities.filter(a => typeof a === 'string' && a.trim()).slice(0, 12).map(a => a.trim().slice(0, 40))
    if (acts.length) preferences.activities = acts
  }
  if (str(pIn.notes, 500)) preferences.notes = str(pIn.notes, 500)

  if (!slug) return Response.json({ error: 'Missing route.' }, { status: 400 })
  if (!name || name.length < 2) return Response.json({ error: 'Please enter your name.' }, { status: 400 })
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'Please enter a valid email.' }, { status: 400 })
  if (name.length > 100 || email.length > 254 || phone.length > 40 || car.length > 120) return Response.json({ error: 'Input too long.' }, { status: 400 })
  // All fields are mandatory (hotel only for trips with nights away — checked after the route lookup)
  if (!phone) return Response.json({ error: 'Please enter your phone number.' }, { status: 400 })
  if (!car) return Response.json({ error: 'Please tell us your car — year, make and model.' }, { status: 400 })
  if (!preferences.budget) return Response.json({ error: 'Please pick a budget range.' }, { status: 400 })
  if (!preferences.dates) return Response.json({ error: 'Please tell us which dates work for you.' }, { status: 400 })
  if (!preferences.activities?.length) return Response.json({ error: 'Please pick at least one activity.' }, { status: 400 })
  if (!preferences.notes) return Response.json({ error: 'Please add a note about what you\'re hoping for.' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: route, error: routeErr } = await supabase
    .from('upcoming_routes')
    .select('id, name, slug, destination, month_label, duration_label, distance_label, trip_type, target_count, launched, threshold_notified_at')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  if (routeErr) {
    captureException(new Error(routeErr.message), { context: 'roadtrip-interest-lookup' })
    return Response.json({ error: 'Could not save your interest. Please try again.' }, { status: 500 })
  }
  if (!route) return Response.json({ error: 'That route is no longer available.' }, { status: 404 })
  if ((route.trip_type === 'overnight' || route.trip_type === 'multi_day') && !preferences.hotel) {
    return Response.json({ error: 'Please pick a hotel preference.' }, { status: 400 })
  }

  // If a guest submits with an email that belongs to a member account, don't
  // register them anonymously — send them to log in so the registration is
  // tied to their account (priority spots, prefilled profile, cross-device).
  if (!isMember) {
    const { data: memberMatch } = await supabase
      .from('members').select('id').eq('email', email).maybeSingle()
    if (memberMatch) {
      return Response.json({
        error: 'This email belongs to a Canvas Routes member account. Log in to register instead — your details fill in automatically and your registration carries member priority.',
        member: true,
      }, { status: 409 })
    }
  }

  // Idempotent per (route, email): update the name/opt-in if they resubmit.
  const { error: upsertErr } = await supabase
    .from('route_interest')
    .upsert({ route_id: route.id, name, email, phone: phone || null, car: car || null, preferences, membership_optin: membershipOptin, is_member: isMember },
            { onConflict: 'route_id,email' })
  if (upsertErr) {
    captureException(new Error(upsertErr.message), { context: 'roadtrip-interest-upsert' })
    return Response.json({ error: 'Could not save your interest. Please try again.' }, { status: 500 })
  }

  // Live count after this submission
  const { count: interestedCount } = await supabase
    .from('route_interest')
    .select('id', { count: 'exact', head: true })
    .eq('route_id', route.id)

  // Mirror the lead into the CRM (applications + contacts), same pattern as the
  // notify flow: never blindly overwrite registrations[] — merge by event name.
  const EVENT_NAME = `Route Interest — ${route.name}`
  try {
    const { data: existing } = await supabase
      .from('applications').select('id, registrations').eq('email', email).maybeSingle()
    const existingReg = (existing?.registrations || []).find(r => r.event === EVENT_NAME)
    const newReg = { event: EVENT_NAME, registered_at: existingReg?.registered_at || new Date().toISOString(), attended: null, membership_optin: membershipOptin }
    const registrations = [...(existing?.registrations || []).filter(r => r.event !== EVENT_NAME), newReg]
    const appPayload = { email, name, registrations, device_type: deviceType(request) }
    if (phone) appPayload.phone = phone       // only set when provided — never wipe existing CRM data
    if (car) appPayload.car_model = car
    const { data: appData, error: appErr } = await supabase.from('applications')
      .upsert(appPayload, { onConflict: 'email' }).select('id').single()
    if (appErr) { captureException(new Error(appErr.message), { context: 'roadtrip-interest-application' }) }
    else if (appData?.id) {
      await supabase.from('contacts').upsert({ application_id: appData.id }, { onConflict: 'application_id', ignoreDuplicates: true })
    }
  } catch (err) { captureException(err, { context: 'roadtrip-interest-crm' }) }

  // Threshold just reached (and not previously alerted, not launched) → tell admin.
  const justHitThreshold = !route.launched && !route.threshold_notified_at &&
    typeof interestedCount === 'number' && interestedCount >= route.target_count
  if (justHitThreshold) {
    await supabase.from('upcoming_routes').update({ threshold_notified_at: new Date().toISOString() }).eq('id', route.id)
  }

  after(() => Promise.allSettled([
    sendEmail({
      from: 'Canvas Routes <info@canvasroutes.com>',
      to: email,
      subject: `You're on the list — ${route.name}`,
      html: buildRouteInterestHtml({ firstName: name.split(' ')[0] || '', route, interestedCount }),
    }, 'roadtrip-interest-confirm-email'),
    sendEmail({
      from: 'Canvas Routes <info@canvasroutes.com>',
      to: 'info@canvasroutes.com',
      subject: `New route interest — ${route.name} (${interestedCount}/${route.target_count})`,
      html: buildAdminNotifyHtml('New route interest', [
        ['Route', route.name],
        ['Name',  name],
        ['Email', `<a href="mailto:${email}" style="color:#1a1a1a;">${email}</a>`],
        ['Phone', phone || '(not provided)'],
        ['Car',   car || '(not provided)'],
        ...(preferences.budget ? [['Budget', preferences.budget]] : []),
        ...(preferences.dates ? [['Preferred dates', preferences.dates]] : []),
        ...(preferences.hotel ? [['Hotel', preferences.hotel]] : []),
        ...(preferences.activities ? [['Activities', preferences.activities.join(', ')]] : []),
        ...(preferences.notes ? [['Notes', preferences.notes]] : []),
        ['Interest', `${interestedCount} / ${route.target_count}`],
        ['Membership waitlist', membershipOptin ? 'Yes' : 'No'],
        ['Member', isMember ? 'Yes' : 'No'],
      ]),
    }, 'roadtrip-interest-admin-email'),
    ...(justHitThreshold ? [sendEmail({
      from: 'Canvas Routes <info@canvasroutes.com>',
      to: 'info@canvasroutes.com',
      subject: `🏁 Threshold reached — ${route.name} is ready to launch`,
      html: buildAdminNotifyHtml('Route ready to launch', [
        ['Route', route.name],
        ['Interest', `${interestedCount} / ${route.target_count}`],
        ['Next step', 'Launch it from Admin → Upcoming Routes to email everyone.'],
      ]),
    }, 'roadtrip-threshold-email')] : []),
  ]))

  return Response.json({ success: true, interested_count: interestedCount ?? null })
}
