import { createAdminClient } from '../../../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../../../lib/supabase/authCheck'

export async function GET(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('event_registrations')
    .select('id, email, name, stripe_payment_status, amount_paid, registered_at')
    .eq('event_id', id)
    .order('registered_at', { ascending: true })
  if (error) return Response.json({ error: process.env.NODE_ENV === 'development' ? error.message : 'Database error' }, { status: 500 })
  return Response.json(data || [])
}

export async function POST(request, { params }) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const { name, email } = await request.json().catch(() => ({}))
  if (!name?.trim() || !email?.trim() || !email.includes('@')) {
    return Response.json({ error: 'Name and valid email are required.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Get the event name so we can write to applications.registrations
  const { data: ev } = await admin.from('events').select('name').eq('id', id).single()
  if (!ev) return Response.json({ error: 'Event not found.' }, { status: 404 })

  const normalEmail = email.toLowerCase().trim()
  const trimmedName = name.trim()

  // Upsert into applications — add this event to their registrations array
  const { data: existing } = await admin.from('applications')
    .select('id, registrations, source')
    .eq('email', normalEmail)
    .maybeSingle()

  const newReg = { event: ev.name, registered_at: new Date().toISOString(), attended: null }
  const prevRegs = (existing?.registrations || []).filter(r => r.event !== ev.name)

  const { data: appData, error: appErr } = await admin.from('applications').upsert({
    email: normalEmail,
    name: trimmedName,
    registrations: [...prevRegs, newReg],
    source: existing?.source || 'Manual — Admin',
    ...(existing ? { reregistered_at: new Date().toISOString() } : {}),
  }, { onConflict: 'email' }).select('id').single()

  if (appErr) return Response.json({ error: appErr.message }, { status: 500 })

  // Ensure contact row exists
  if (appData?.id) {
    await admin.from('contacts').upsert(
      { application_id: appData.id },
      { onConflict: 'application_id', ignoreDuplicates: true }
    ).catch(() => {})
  }

  return Response.json({ success: true })
}
