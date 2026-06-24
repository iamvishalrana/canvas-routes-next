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
    .select('name, email, wtet_checkin, stripe_payment_status')
    .eq('stripe_payment_intent_id', token)
    .in('stripe_payment_status', ['paid', 'authorized'])
    .maybeSingle()

  if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({
    name: data.name,
    email: data.email,
    alreadyCompleted: !!data.wtet_checkin,
  })
}

// POST body: { token, dietary, whatsapp }
export async function POST(request) {
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { token, dietary, whatsapp } = body || {}
  if (!token) return Response.json({ error: 'Missing token' }, { status: 400 })

  const supabase = createAdminClient()

  // Verify the application exists
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
        dietary: dietary || null,
        whatsapp: whatsapp || null,
        completed_at: new Date().toISOString(),
      },
    })
    .eq('stripe_payment_intent_id', token)

  if (updateErr) return Response.json({ error: 'Failed to save' }, { status: 500 })

  return Response.json({ success: true })
}
