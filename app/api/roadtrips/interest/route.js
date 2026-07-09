import { after } from 'next/server'
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
  const membershipOptin = !!body.membership_optin
  const isMember = !!body.is_member

  if (!slug) return Response.json({ error: 'Missing route.' }, { status: 400 })
  if (!name || name.length < 2) return Response.json({ error: 'Please enter your name.' }, { status: 400 })
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'Please enter a valid email.' }, { status: 400 })
  if (name.length > 100 || email.length > 254) return Response.json({ error: 'Input too long.' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: route, error: routeErr } = await supabase
    .from('upcoming_routes')
    .select('id, name, slug, destination, month_label, target_count, launched, threshold_notified_at')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  if (routeErr) {
    captureException(new Error(routeErr.message), { context: 'roadtrip-interest-lookup' })
    return Response.json({ error: 'Could not save your interest. Please try again.' }, { status: 500 })
  }
  if (!route) return Response.json({ error: 'That route is no longer available.' }, { status: 404 })

  // Idempotent per (route, email): update the name/opt-in if they resubmit.
  const { error: upsertErr } = await supabase
    .from('route_interest')
    .upsert({ route_id: route.id, name, email, membership_optin: membershipOptin, is_member: isMember },
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
  const EVENT_NAME = `Roadtrip Interest — ${route.name}`
  try {
    const { data: existing } = await supabase
      .from('applications').select('id, registrations').eq('email', email).maybeSingle()
    const existingReg = (existing?.registrations || []).find(r => r.event === EVENT_NAME)
    const newReg = { event: EVENT_NAME, registered_at: existingReg?.registered_at || new Date().toISOString(), attended: null, membership_optin: membershipOptin }
    const registrations = [...(existing?.registrations || []).filter(r => r.event !== EVENT_NAME), newReg]
    const { data: appData, error: appErr } = await supabase.from('applications')
      .upsert({ email, name, registrations }, { onConflict: 'email' }).select('id').single()
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
      html: buildRouteInterestHtml({ firstName: name.split(' ')[0] || '', routeName: route.name, monthLabel: route.month_label }),
    }, 'roadtrip-interest-confirm-email'),
    sendEmail({
      from: 'Canvas Routes <info@canvasroutes.com>',
      to: 'info@canvasroutes.com',
      subject: `New roadtrip interest — ${route.name} (${interestedCount}/${route.target_count})`,
      html: buildAdminNotifyHtml('New roadtrip interest', [
        ['Route', route.name],
        ['Name',  name],
        ['Email', `<a href="mailto:${email}" style="color:#1a1a1a;">${email}</a>`],
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
