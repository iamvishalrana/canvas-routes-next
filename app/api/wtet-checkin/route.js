import { createAdminClient } from '../../../lib/supabase/admin.js'

export const runtime = 'nodejs'

// GET ?t=pi_xxx — look up application by stripe_payment_intent_id
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('t')
  if (!token) return Response.json({ error: 'Missing token' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('applications')
    .select('name, email, passengers, wtet_checkin, stripe_payment_status')
    .eq('stripe_payment_intent_id', token)
    .in('stripe_payment_status', ['paid', 'authorized'])
    .maybeSingle()

  if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({
    name:             data.name,
    email:            data.email,
    passengers:       data.passengers || '1',
    alreadyCompleted: !!data.wtet_checkin,
  })
}

// POST body: { token, dietary, whatsapp, passengers_list }
export async function POST(request) {
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { token, dietary, whatsapp, passengers_list } = body || {}
  if (!token) return Response.json({ error: 'Missing token' }, { status: 400 })

  // Validate passengers_list
  if (!Array.isArray(passengers_list) || passengers_list.length === 0) {
    return Response.json({ error: 'At least one passenger (the driver) is required.' }, { status: 400 })
  }
  for (const p of passengers_list) {
    if (!p.name?.trim()) return Response.json({ error: 'Please provide a name for each passenger.' }, { status: 400 })
    if (!p.age?.toString().trim()) return Response.json({ error: 'Please provide an age for each passenger.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error: lookupErr } = await supabase
    .from('applications')
    .select('id')
    .eq('stripe_payment_intent_id', token)
    .in('stripe_payment_status', ['paid', 'authorized'])
    .maybeSingle()

  if (lookupErr || !data) return Response.json({ error: 'Not found' }, { status: 404 })

  const { error: updateErr } = await supabase
    .from('applications')
    .update({
      wtet_checkin: {
        dietary:         dietary || null,
        whatsapp:        whatsapp || null,
        passengers_list: passengers_list.map(p => ({ name: p.name.trim(), age: p.age.toString().trim() })),
        completed_at:    new Date().toISOString(),
      },
    })
    .eq('stripe_payment_intent_id', token)

  if (updateErr) return Response.json({ error: 'Failed to save' }, { status: 500 })

  return Response.json({ success: true })
}
