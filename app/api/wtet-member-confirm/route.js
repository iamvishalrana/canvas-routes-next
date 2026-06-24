import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { stripe } from '../../../lib/stripe.js'
import { captureException } from '../../../lib/sentry.js'

const EVENT_NAME = 'Whips to Eastern Townships — July 5, 2026'

function buildConfirmHtml(firstName, amount, checkinUrl) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#F5F1EC;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;">
  <tr><td align="center" style="padding:32px 16px 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;">
      <tr><td style="background:#0F1E14;padding:32px 40px 28px;">
        <img src="https://canvasroutes.com/canvas_routes_refined.png" alt="Canvas Routes" width="150" style="display:block;width:150px;height:auto;border:0;margin-bottom:24px;opacity:0.92;" />
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40" style="margin-bottom:20px;"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background:#c5a882;">&nbsp;</td></tr></table>
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#c5a882;">Canvas Routes &middot; Road Trip</p>
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:300;line-height:1.2;color:#F5F1EC;">You&apos;re confirmed, ${firstName}.</h1>
      </td></tr>
      <tr><td style="background:#ffffff;padding:36px 40px 32px;">
        <p style="margin:0 0 1.4em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">Your payment for <strong style="color:#1a1a1a;font-weight:500;">${EVENT_NAME}</strong> has been received. You&apos;re on the list.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#EDE8E1;border-left:3px solid #c5a882;margin-bottom:24px;">
          <tr><td style="padding:18px 20px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;">Event</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;margin-bottom:14px;">${EVENT_NAME}</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;border-top:1px solid rgba(0,0,0,0.12);padding-top:14px;">Payment</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#3B6B2F;font-weight:500;">${amount} &mdash; Confirmed</div>
          </td></tr>
        </table>
        <p style="margin:0 0 1em;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#666;">You&apos;ll receive a full itinerary, meeting point, and everything you need closer to the date. Keep an eye on <a href="https://www.instagram.com/canvasroutes" style="color:#3B6B2F;text-decoration:none;">@canvasroutes</a> for updates.</p>
        <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#666;">Add <strong style="color:#555;font-weight:500;">info@canvasroutes.com</strong> and <strong style="color:#555;font-weight:500;">jerry@canvasroutes.com</strong> to your contacts so you don&apos;t miss any updates &mdash; our emails may land in spam.</p>
        ${checkinUrl ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
          <tr><td style="background:#0F1E14;">
            <a href="${checkinUrl}" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#F5F1EC;text-decoration:none;">Complete Early Check-in &rarr;</a>
          </td></tr>
        </table>
        <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#bbb;">If you&apos;ve already completed the check-in, you can ignore this button.</p>` : ''}
        <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#666;">Please note that we will have a <strong style="color:#1a1a1a;font-weight:500;">waiver for you to sign</strong> before the trip begins. This is standard for all Canvas Routes events and covers all passengers in your vehicle.</p>
        <p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:#666;">Any questions &mdash; reply directly to this email or reach out at <a href="mailto:jerry@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">jerry@canvasroutes.com</a>.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="border:0.5px solid rgba(0,0,0,0.18);">
            <a href="https://www.instagram.com/canvasroutes" style="display:inline-block;padding:11px 22px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#555;text-decoration:none;">Follow &#64;canvasroutes &rarr;</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="background:#0F1E14;padding:16px 40px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(245,241,236,0.3);">&copy; 2026 Canvas Routes. Montreal, QC. &nbsp;&middot;&nbsp; <a href="https://canvasroutes.com" style="color:rgba(197,168,130,0.4);text-decoration:none;">canvasroutes.com</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

// Called by the WTET page immediately after stripe.confirmPayment() succeeds for members.
// Sends the confirmation email directly instead of relying solely on the webhook.
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid request' }, { status: 400 }) }

  const { paymentIntentId } = body
  if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
    return Response.json({ error: 'Invalid payment intent ID' }, { status: 400 })
  }

  if (!stripe) return Response.json({ error: 'Payments not configured' }, { status: 503 })

  let pi
  try {
    pi = await stripe.paymentIntents.retrieve(paymentIntentId)
  } catch (err) {
    captureException(err, { context: 'wtet-member-confirm-retrieve', piId: paymentIntentId })
    return Response.json({ error: 'Could not verify payment' }, { status: 500 })
  }

  // Guard: must be a succeeded member WTET payment belonging to this user
  if (pi.status !== 'succeeded') return Response.json({ error: 'Payment not yet confirmed' }, { status: 400 })
  if (pi.metadata?.type !== 'road_trip_wtet') return Response.json({ error: 'Invalid payment type' }, { status: 400 })
  if (pi.metadata?.is_member !== 'yes') return Response.json({ error: 'Not a member payment' }, { status: 400 })
  if (pi.metadata?.email?.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const normalEmail = user.email.toLowerCase().trim()
  const memberName = pi.metadata?.name || normalEmail.split('@')[0]
  const firstName = memberName.trim().split(' ')[0] || 'there'
  const amount = `$${(pi.amount_received / 100).toFixed(2)} CAD`
  const checkinUrl = `https://canvasroutes.com/wtet/checkin?t=${pi.id}`

  // Update application to mark payment as paid — look up by email since the PI ID
  // may not be stored yet if wtet-member-register's update hasn't propagated
  const admin = createAdminClient()
  const { error: confirmDbErr } = await admin.from('applications').update({
    stripe_payment_intent_id: pi.id,
    stripe_payment_status: 'paid',
    stripe_amount_paid: pi.amount_received,
    stripe_payment_type: 'road_trip_wtet',
    stripe_paid_at: new Date().toISOString(),
  }).eq('email', normalEmail)
  if (confirmDbErr) captureException(confirmDbErr, { context: 'wtet-member-confirm-db', piId: pi.id })

  if (!process.env.RESEND_API_KEY) return Response.json({ ok: true })

  try {
    await Promise.all([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Canvas Routes <info@canvasroutes.com>',
          to: normalEmail,
          reply_to: 'jerry@canvasroutes.com',
          subject: `Payment confirmed — ${EVENT_NAME}`,
          html: buildConfirmHtml(firstName, amount, checkinUrl),
          text: `Hey ${firstName},\n\nYour payment of ${amount} for ${EVENT_NAME} is confirmed.\n\nYou'll receive a full itinerary and all event details closer to the date. In the meantime, follow @canvasroutes on Instagram for updates.\n\nSee you on the road,\nJerry\nCanvas Routes`,
        }),
      }),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'Canvas Routes <info@canvasroutes.com>',
          to: 'jerry@canvasroutes.com',
          subject: `New WTET Member Registration — ${memberName}`,
          text: `New member registration for ${EVENT_NAME}\n\nName: ${memberName}\nEmail: ${normalEmail}\nAmount: ${amount}\nCar: ${pi.metadata?.car_model || '—'}\nPassengers: ${pi.metadata?.passengers || '—'}\nChildren: ${pi.metadata?.has_children || '—'}\nPI: ${pi.id}`,
        }),
      }),
    ])
  } catch (err) {
    captureException(err, { context: 'wtet-member-confirm-email', email: normalEmail })
  }

  return Response.json({ ok: true })
}
