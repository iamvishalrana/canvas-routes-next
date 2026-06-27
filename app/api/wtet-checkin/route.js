import { after } from 'next/server'
import { createAdminClient } from '../../../lib/supabase/admin.js'
import { captureException } from '../../../lib/sentry.js'

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
  if (passengers_list.length > 10) {
    return Response.json({ error: 'Too many passengers.' }, { status: 400 })
  }
  for (const p of passengers_list) {
    if (!p.name?.trim()) return Response.json({ error: 'Please provide a name for each passenger.' }, { status: 400 })
    const ageNum = parseInt(p.age)
    if (!p.age?.toString().trim() || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return Response.json({ error: 'Please provide a valid age (1–120) for each passenger.' }, { status: 400 })
    }
  }

  const supabase = createAdminClient()

  const { data, error: lookupErr } = await supabase
    .from('applications')
    .select('id, name, email, wtet_checkin')
    .eq('stripe_payment_intent_id', token)
    .in('stripe_payment_status', ['paid', 'authorized'])
    .maybeSingle()

  if (lookupErr || !data) return Response.json({ error: 'Not found' }, { status: 404 })
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
    .eq('stripe_payment_intent_id', token)

  if (updateErr) return Response.json({ error: 'Failed to save' }, { status: 500 })

  // Notify Jerry — after() keeps the function alive until the fetch settles without blocking the response.
  if (process.env.RESEND_API_KEY) {
    after(() => {
      const passengerRows = cleanedPassengers.map((p, i) =>
        `<tr><td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#888;">${i === 0 ? 'Driver' : `Passenger ${i + 1}`}</td><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;">${p.name}, age ${p.age}</td></tr>`
      ).join('')
      return fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Canvas Routes <info@canvasroutes.com>',
          to: 'jerry@canvasroutes.com',
          subject: `WTET Check-in Completed — ${data.name || 'Registrant'}`,
          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#fff;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fff;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px;width:100%;">
      <tr><td style="padding-bottom:16px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888;">WTET Early Check-in</td></tr>
      <tr><td style="padding-bottom:24px;font-family:Arial,Helvetica,sans-serif;font-size:20px;color:#1a1a1a;font-weight:400;">${data.name || 'A registrant'} has completed their check-in.</td></tr>
      <tr><td>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding:8px 12px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#888;width:160px;">Email</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;">${data.email || '—'}</td></tr>
          <tr><td style="padding:8px 12px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#888;">Dietary</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;">${dietary || 'None'}</td></tr>
          <tr><td style="padding:8px 12px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#888;">WhatsApp</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;">${whatsapp || 'Not provided'}</td></tr>
        </table>
        <div style="margin-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#888;margin-bottom:8px;">Passengers</div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${passengerRows}</table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
        }),
      }).catch(err => captureException(err, { context: 'wtet-checkin-notify-jerry', token }))
    })
  }

  return Response.json({ success: true })
}
