import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { checkRateLimit } from '../../../../lib/rateLimit'

export async function GET(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
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
      .select('application_id, event_name, confirmed_at, answers, expires_at, created_at')
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
  }))
  return Response.json(result)
}

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
  if (await checkRateLimit(ip, 200, 60)) return Response.json({ error: 'Too many requests' }, { status: 429 })
  const body = await request.json()
  const supabase = createAdminClient()

  // Existing flow: link an existing application to contacts
  if (body.application_id) {
    const { error } = await supabase.from('contacts').insert({ application_id: body.application_id })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  }

  // New flow: create application record + contact directly (no email sent)
  const { name, email, phone, car_year, car_model } = body
  if (!name?.trim() || !email?.trim()) return Response.json({ error: 'Name and email are required.' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'Invalid email address.' }, { status: 400 })

  const { data: app, error: appErr } = await supabase.from('applications').upsert({
    email: email.toLowerCase().trim(),
    name: name.trim(),
    phone: phone?.trim() || null,
    car_year: car_year?.trim() || null,
    car_model: car_model?.trim() || null,
    registrations: [],
  }, { onConflict: 'email' }).select('id').single()

  if (appErr) return Response.json({ error: appErr.message }, { status: 500 })

  const { error: contactErr } = await supabase.from('contacts')
    .upsert({ application_id: app.id }, { onConflict: 'application_id', ignoreDuplicates: true })

  if (contactErr) return Response.json({ error: contactErr.message }, { status: 500 })
  return Response.json({ success: true })
}
