import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimit'
import { normalizeWtetLunch } from '../../../../lib/wtetRegistrationContent'

export async function GET(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 200, 60)) return Response.json({ error: 'Too many requests' }, { status: 429 })
  const supabase = createAdminClient()

  const { data: contacts, error: contactsErr } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false })
  if (contactsErr) return Response.json({ error: contactsErr.message }, { status: 500 })

  if (!contacts || contacts.length === 0) return Response.json([])

  const appIds = contacts.map(c => c.application_id)
  const { data: applications, error: appsErr } = await supabase
    .from('applications')
    .select('*')
    .in('id', appIds)
  if (appsErr) return Response.json({ error: appsErr.message }, { status: 500 })

  const appMap = Object.fromEntries((applications || []).map(a => [a.id, a]))

  const [{ data: members }, { data: rsvpTokens }] = await Promise.all([
    supabase.from('members').select('email'),
    supabase.from('rsvp_tokens')
      .select('application_id, event_name, confirmed_at, declined_at, answers, expires_at, created_at')
      .in('application_id', appIds)
      .order('created_at', { ascending: false }),
  ])

  const rsvpByApp = {}
  for (const t of (rsvpTokens || [])) {
    if (!rsvpByApp[t.application_id]) rsvpByApp[t.application_id] = []
    rsvpByApp[t.application_id].push(t)
  }

  const memberEmails = new Set((members || []).map(m => m.email?.toLowerCase()))
  const result = contacts.map(c => ({
    ...(appMap[c.application_id] || {}),
    contact_id: c.id,
    application_id: c.application_id,
    contact_created_at: c.created_at,
    notes: c.notes || null,
    is_invited: memberEmails.has(((appMap[c.application_id] || {}).email || '').toLowerCase()),
    rsvp_history: rsvpByApp[c.application_id] || [],
    wtet_lunch: normalizeWtetLunch(appMap[c.application_id]?.wtet_lunch),
  }))
  // Short client-side cache so quickly flipping between admin tabs doesn't always
  // cold-refetch the full table — realtime sync still pushes updates within the window.
  return Response.json(result, { headers: { 'Cache-Control': 'private, max-age=15' } })
}

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = getClientIp(request)
  if (await checkRateLimit(ip, 200, 60)) return Response.json({ error: 'Too many requests' }, { status: 429 })
  const body = await request.json()
  const supabase = createAdminClient()

  // Existing flow: link an existing application to contacts.
  // Seed contacts.notes from the application's quick note so the Contacts
  // screen doesn't show an empty note for someone who already has one.
  if (body.application_id) {
    const { data: appRow } = await supabase.from('applications').select('notes').eq('id', body.application_id).maybeSingle()
    const { error } = await supabase.from('contacts').insert({ application_id: body.application_id, notes: appRow?.notes ?? null })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  }

  // New flow: create application record + contact directly (no email sent)
  const { name, email, phone, car_year, car_model } = body
  if (!name?.trim() || !email?.trim()) return Response.json({ error: 'Name and email are required.' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'Invalid email address.' }, { status: 400 })

  // Never upsert registrations here — an upsert with registrations: [] would
  // wipe the event history of an existing applicant with the same email.
  const normalEmail = email.toLowerCase().trim()
  const { data: existingApp, error: lookupErr } = await supabase.from('applications')
    .select('id').eq('email', normalEmail).maybeSingle()
  if (lookupErr) return Response.json({ error: lookupErr.message }, { status: 500 })

  let app = existingApp
  if (existingApp) {
    const update = { name: name.trim() }
    if (phone?.trim()) update.phone = phone.trim()
    if (car_year?.trim()) update.car_year = car_year.trim()
    if (car_model?.trim()) update.car_model = car_model.trim()
    const { error: updErr } = await supabase.from('applications').update(update).eq('id', existingApp.id)
    if (updErr) return Response.json({ error: updErr.message }, { status: 500 })
  } else {
    const { data: inserted, error: appErr } = await supabase.from('applications').insert({
      email: normalEmail,
      name: name.trim(),
      phone: phone?.trim() || null,
      car_year: car_year?.trim() || null,
      car_model: car_model?.trim() || null,
      registrations: [],
    }).select('id').single()
    if (appErr) return Response.json({ error: appErr.message }, { status: 500 })
    app = inserted
  }

  const { error: contactErr } = await supabase.from('contacts')
    .upsert({ application_id: app.id }, { onConflict: 'application_id', ignoreDuplicates: true })

  if (contactErr) return Response.json({ error: contactErr.message }, { status: 500 })
  return Response.json({ success: true })
}
