import { createAdminClient } from '../../../../../lib/supabase/admin'
import { checkRateLimit } from '../../../../../lib/rateLimit'

export async function GET(request, { params }) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (await checkRateLimit(ip, 60, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  const { token } = await params
  if (!token) return Response.json({ error: 'Invalid link.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: tokenRow } = await supabase
    .from('rsvp_tokens')
    .select('id, event_name, confirmed_at, answers, application_id, applications(name, email, car_year, car_make, car_model, phone)')
    .eq('token', token)
    .maybeSingle()

  if (!tokenRow) return Response.json({ error: 'Invalid link.' }, { status: 404 })
  if (!tokenRow.confirmed_at) return Response.json({ error: 'Please complete your check-in first.' }, { status: 403 })

  const app = tokenRow.applications
  const email = app?.email?.toLowerCase() || ''

  // Check member status and get car photo
  let isMember = false
  let carPhotoUrl = null
  if (email) {
    const { data: member } = await supabase
      .from('members')
      .select('id, car_photo_url, tier')
      .eq('email', email)
      .maybeSingle()
    if (member) {
      isMember = true
      carPhotoUrl = member.car_photo_url || null
    }
  }

  return Response.json({
    eventName: tokenRow.event_name,
    name: app?.name || '',
    email,
    carYear: app?.car_year || '',
    carMake: app?.car_make || '',
    carModel: app?.car_model || '',
    carPhotoUrl,
    isMember,
    answers: tokenRow.answers || {},
  })
}

export async function PATCH(request, { params }) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (await checkRateLimit(ip, 20, 60)) return Response.json({ error: 'Too many requests.' }, { status: 429 })

  const { token } = await params
  if (!token) return Response.json({ error: 'Invalid link.' }, { status: 400 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }

  const supabase = createAdminClient()
  const { data: tokenRow } = await supabase
    .from('rsvp_tokens')
    .select('id, confirmed_at, answers')
    .eq('token', token)
    .maybeSingle()

  if (!tokenRow) return Response.json({ error: 'Invalid link.' }, { status: 404 })
  if (!tokenRow.confirmed_at) return Response.json({ error: 'Complete check-in first.' }, { status: 403 })

  const { dietary, whatsapp, passengerDetails } = body

  const updatedAnswers = {
    ...(tokenRow.answers || {}),
    ...(dietary !== undefined ? { dietary: (dietary || '').trim() || null } : {}),
    ...(whatsapp !== undefined ? { whatsapp } : {}),
    ...(passengerDetails !== undefined ? { passenger_details: passengerDetails } : {}),
  }

  const { error } = await supabase
    .from('rsvp_tokens')
    .update({ answers: updatedAnswers })
    .eq('token', token)

  if (error) return Response.json({ error: 'Failed to save.' }, { status: 500 })
  return Response.json({ success: true, answers: updatedAnswers })
}
