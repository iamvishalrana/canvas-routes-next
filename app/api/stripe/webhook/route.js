import { stripe } from '../../../../lib/stripe.js'
import { createAdminClient } from '../../../../lib/supabase/admin.js'
import { captureException, captureMessage } from '../../../../lib/sentry.js'

// Stripe requires the raw body — Next.js must NOT parse it
export const runtime = 'nodejs'

function buildRoadTripConfirmHtml(firstName, eventLabel, amount) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#0F1E14;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F1E14;">
  <tr><td align="center" style="padding:48px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;">
      <tr><td style="padding-bottom:32px;"><img src="https://canvasroutes.com/canvas_routes_refined.png" alt="Canvas Routes" width="200" style="display:block;width:200px;height:auto;border:0;" /></td></tr>
      <tr><td style="padding-bottom:28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="40"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;background-color:#c5a882;">&nbsp;</td></tr></table></td></tr>
      <tr><td style="padding-bottom:14px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;">Canvas Routes &middot; Road Trip</td></tr>
      <tr><td style="padding-bottom:20px;font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:300;line-height:1.2;color:#F5F1EC;">You&apos;re confirmed, ${firstName}.</td></tr>
      <tr><td style="padding-bottom:32px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.8;color:rgba(245,241,236,0.8);">Your payment for <strong style="font-weight:400;color:#F5F1EC;">${eventLabel}</strong> has been received. You&apos;re on the list.</td></tr>
      <tr><td style="padding-bottom:32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:rgba(197,168,130,0.06);border:0.5px solid rgba(197,168,130,0.18);">
          <tr><td style="padding:24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="padding-bottom:16px;border-bottom:1px solid rgba(197,168,130,0.1);">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;">Event</div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#F5F1EC;">${eventLabel}</div>
              </td></tr>
              <tr><td style="padding-top:16px;">
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;">Payment</div>
                <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#F5F1EC;">${amount} &mdash; Confirmed</div>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding-bottom:28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:rgba(245,241,236,0.55);">You&apos;ll receive a full itinerary, meeting point, and everything you need closer to the date. In the meantime, keep an eye on <a href="https://www.instagram.com/canvasroutes" style="color:rgba(197,168,130,0.7);text-decoration:none;">@canvasroutes</a> for updates.</td></tr>
      <tr><td style="padding-bottom:32px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:rgba(245,241,236,0.55);">Any questions &mdash; reply directly to this email or reach out at <a href="mailto:jerry@canvasroutes.com" style="color:rgba(197,168,130,0.7);text-decoration:none;">jerry@canvasroutes.com</a>.</td></tr>
      <tr><td style="padding-bottom:28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border:1px solid rgba(197,168,130,0.35);"><a href="https://www.instagram.com/canvasroutes" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;text-decoration:none;">Follow &#64;canvasroutes &rarr;</a></td></tr></table></td></tr>
      <tr><td style="padding-top:20px;border-top:1px solid rgba(197,168,130,0.12);font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(245,241,236,0.3);line-height:1.8;">&copy; 2026 Canvas Routes. Montreal, QC.<br/><a href="https://canvasroutes.com" style="color:rgba(197,168,130,0.4);text-decoration:none;">canvasroutes.com</a></td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

export async function POST(request) {
  if (!stripe) {
    return new Response('Payments not configured.', { status: 503 })
  }

  const sig  = request.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !secret) {
    return new Response('Missing signature.', { status: 400 })
  }

  // Read raw body — required for Stripe signature verification
  const rawBody = await request.text()

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret)
  } catch (err) {
    console.error('Stripe webhook signature failed:', err.message)
    return new Response('Webhook signature verification failed.', { status: 400 })
  }

  try {
    switch (event.type) {

      case 'payment_intent.succeeded': {
        const pi       = event.data.object
        const { type, email, name, event_name: eventName, event_id, member_id } = pi.metadata
        const amountPaid = pi.amount_received  // cents
        const normalEmail = email?.toLowerCase().trim()

        if (!normalEmail) {
          captureMessage('Stripe payment succeeded but no email in metadata', { piId: pi.id })
          break
        }

        const supabase = createAdminClient()

        if (type === 'event_registration' && event_id && member_id) {
          const { data: memberExists } = await supabase.from('members').select('id').eq('id', member_id).maybeSingle()
          if (!memberExists) {
            captureMessage('Event registration webhook: member row not found', { piId: pi.id, member_id })
            break
          }
          await supabase.from('event_registrations').upsert({
            event_id,
            member_id,
            email: normalEmail,
            name: name || '',
            stripe_payment_intent_id: pi.id,
            stripe_payment_status: 'paid',
            amount_paid: amountPaid,
          }, { onConflict: 'uq_event_reg_event_member' })
          console.log(`Event registration confirmed: ${event_id} — ${normalEmail} — $${(amountPaid / 100).toFixed(2)} CAD`)
        } else if (type?.startsWith('membership_')) {
          // Membership payment captured — update application row
          await supabase.from('applications').upsert({
            email:                     normalEmail,
            name:                      name || '',
            stripe_payment_intent_id:  pi.id,
            stripe_payment_status:     'paid',
            stripe_amount_paid:        amountPaid,
            stripe_payment_type:       type,
            stripe_paid_at:            new Date().toISOString(),
          }, { onConflict: 'email' })
          // Also patch stripe_paid_at in case the capture-route DB write previously failed
          await supabase.from('applications')
            .update({ stripe_paid_at: new Date().toISOString() })
            .eq('stripe_payment_intent_id', pi.id)
            .is('stripe_paid_at', null)
          console.log(`Membership payment confirmed: ${type} — ${normalEmail} — $${(amountPaid / 100).toFixed(2)} CAD`)
        } else if (type?.startsWith('road_trip_')) {
          // Road trip payment confirmed — record in DB and send confirmation email
          const amountFormatted = `$${(amountPaid / 100).toFixed(2)} CAD`
          const firstName = (name || '').trim().split(' ')[0] || 'there'
          const eventLabel = eventName || 'Canvas Routes Road Trip'
          console.log(`Road trip payment confirmed: ${type} — ${normalEmail} — ${amountFormatted}`)
          // Write to applications so the payment appears in admin records
          await supabase.from('applications').upsert({
            email:                     normalEmail,
            name:                      name || '',
            stripe_payment_intent_id:  pi.id,
            stripe_payment_status:     'paid',
            stripe_amount_paid:        amountPaid,
            stripe_payment_type:       type,
            stripe_paid_at:            new Date().toISOString(),
          }, { onConflict: 'email' }).catch(err =>
            captureException(err, { context: 'road-trip-payment-db', piId: pi.id })
          )
          if (process.env.RESEND_API_KEY && normalEmail) {
            try {
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
                body: JSON.stringify({
                  from: 'Canvas Routes <info@canvasroutes.com>',
                  to: normalEmail,
                  reply_to: 'jerry@canvasroutes.com',
                  subject: `Payment confirmed — ${eventLabel}`,
                  html: buildRoadTripConfirmHtml(firstName, eventLabel, amountFormatted),
                  text: `Hey ${firstName},\n\nYour payment of ${amountFormatted} for ${eventLabel} is confirmed.\n\nYou'll receive a full itinerary and all event details closer to the date. In the meantime, follow @canvasroutes on Instagram for updates.\n\nSee you on the road,\nJerry\nCanvas Routes`,
                }),
              })
            } catch (emailErr) {
              captureException(emailErr, { context: 'road-trip-payment-confirm-email', email: normalEmail })
            }
          }
        }
        break
      }

      case 'payment_intent.requires_capture': {
        // Customer authorized the hold — admin approval needed before capture
        const pi       = event.data.object
        const { type, email, name } = pi.metadata
        // Only membership payments use manual capture — guard against accidental matches
        if (!type?.startsWith('membership_')) break
        const amountHeld = pi.amount
        const normalEmail = email?.toLowerCase().trim()

        if (!normalEmail) break

        const supabase = createAdminClient()
        await supabase.from('applications').upsert({
          email:                    normalEmail,
          name:                     name || '',
          stripe_payment_intent_id: pi.id,
          stripe_payment_status:    'authorized',
          stripe_amount_paid:       amountHeld,
          stripe_payment_type:      type,
        }, { onConflict: 'email' })

        console.log(`Payment authorized (held): ${type} — ${normalEmail} — $${(amountHeld / 100).toFixed(2)} CAD`)
        break
      }

      case 'payment_intent.canceled': {
        // Admin rejected the application — hold released
        const pi    = event.data.object
        const email = pi.metadata?.email?.toLowerCase().trim()
        if (email) {
          const supabase = createAdminClient()
          await supabase.from('applications')
            .update({ stripe_payment_status: 'rejected' })
            .eq('stripe_payment_intent_id', pi.id)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const pi       = event.data.object
        const email    = pi.metadata?.email?.toLowerCase().trim()
        const errMsg   = pi.last_payment_error?.message || 'unknown'
        console.error(`Payment failed: ${email} — ${errMsg}`)
        captureMessage(`Stripe payment failed — ${email}`, { error: errMsg, piId: pi.id })
        const supabase = createAdminClient()
        if (pi.metadata?.type === 'event_registration' && pi.metadata?.event_id && pi.metadata?.member_id) {
          await supabase.from('event_registrations')
            .update({ stripe_payment_status: 'failed' })
            .eq('event_id', pi.metadata.event_id)
            .eq('member_id', pi.metadata.member_id)
        } else {
          await supabase.from('applications')
            .update({ stripe_payment_status: 'failed' })
            .eq('stripe_payment_intent_id', pi.id)
        }
        break
      }

      case 'charge.dispute.created': {
        const dispute  = event.data.object
        const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id
        captureMessage(`Stripe dispute created — charge ${chargeId}`, { disputeId: dispute.id, reason: dispute.reason })
        if (chargeId) {
          try {
            const charge = await stripe.charges.retrieve(chargeId)
            if (charge.payment_intent) {
              const pi = await stripe.paymentIntents.retrieve(charge.payment_intent)
              const supabase = createAdminClient()
              if (pi.metadata?.type === 'event_registration' && pi.metadata?.event_id && pi.metadata?.member_id) {
                // event_registrations CHECK constraint does not include 'disputed' — skip DB update,
                // Sentry alert above is sufficient for operational awareness
              } else {
                await supabase.from('applications')
                  .update({ stripe_payment_status: 'disputed' })
                  .eq('stripe_payment_intent_id', charge.payment_intent)
              }
            }
          } catch (err) {
            captureException(err, { context: 'dispute-webhook', chargeId })
          }
        }
        break
      }

      case 'payment_intent.created':
      case 'charge.succeeded':
      case 'charge.updated':
        // Acknowledged — no action needed
        break

      default:
        console.log(`Unhandled Stripe event: ${event.type}`)
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err)
    captureException(err, { context: 'stripe-webhook', eventType: event.type })
    // Return 200 anyway — Stripe will retry on 5xx, which could cause duplicate processing
    return new Response('Handler error logged.', { status: 200 })
  }

  return new Response('OK', { status: 200 })
}
