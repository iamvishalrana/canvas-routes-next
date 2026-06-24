import { stripe } from '../../../../lib/stripe.js'
import { createAdminClient } from '../../../../lib/supabase/admin.js'
import { captureException, captureMessage } from '../../../../lib/sentry.js'

// Stripe requires the raw body — Next.js must NOT parse it
export const runtime = 'nodejs'

function buildRoadTripHoldHtml(firstName, eventLabel, amount) {
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
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:300;line-height:1.2;color:#F5F1EC;">Registration received, ${firstName}.</h1>
      </td></tr>
      <tr><td style="background:#ffffff;padding:36px 40px 32px;">
        <p style="margin:0 0 1.4em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">We&apos;ve received your registration for <strong style="color:#1a1a1a;font-weight:500;">${eventLabel}</strong>.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;border-left:3px solid #c5a882;margin-bottom:24px;">
          <tr><td style="padding:18px 20px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;">Event</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;margin-bottom:14px;">${eventLabel}</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;border-top:1px solid rgba(0,0,0,0.06);padding-top:14px;">Authorization hold</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;font-weight:500;">${amount} &mdash; held, not charged</div>
          </td></tr>
        </table>
        <p style="margin:0 0 1em;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#666;">Your card has been authorized but <strong style="color:#1a1a1a;font-weight:500;">nothing has been charged yet.</strong> We review every registration personally &mdash; if you&apos;re confirmed, the charge goes through and you&apos;ll receive full event details. If we can&apos;t place you, the hold is released with no charge.</p>
        <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#999;">Add <strong style="color:#555;font-weight:500;">jerry@canvasroutes.com</strong> to your contacts so our reply gets through.</p>
        <p style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.8;color:#666;">Questions? Reply directly to this email or reach out at <a href="mailto:jerry@canvasroutes.com" style="color:#3B6B2F;text-decoration:none;">jerry@canvasroutes.com</a>.</p>
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

function buildRoadTripConfirmHtml(firstName, eventLabel, amount, checkinUrl) {
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
        <p style="margin:0 0 1.4em;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.85;color:#444;">Your payment for <strong style="color:#1a1a1a;font-weight:500;">${eventLabel}</strong> has been received. You&apos;re on the list.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1EC;border-left:3px solid #c5a882;margin-bottom:24px;">
          <tr><td style="padding:18px 20px;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;">Event</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;margin-bottom:14px;">${eventLabel}</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#c5a882;margin-bottom:4px;border-top:1px solid rgba(0,0,0,0.06);padding-top:14px;">Payment</div>
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
          if (!normalEmail) {
            captureMessage('Road trip payment succeeded but no email in metadata', { piId: pi.id })
            break
          }
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
          // Members get their confirmation email from /api/wtet-member-confirm (called
          // directly by the page after payment). Webhook only sends for non-members
          // (whose payment_intent.succeeded fires after admin manually captures the hold).
          const isMember = pi.metadata?.is_member === 'yes'
          if (!isMember && process.env.RESEND_API_KEY && normalEmail) {
            const checkinUrl = `https://canvasroutes.com/wtet/checkin?t=${pi.id}`
            await Promise.all([
              fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
                body: JSON.stringify({
                  from: 'Canvas Routes <info@canvasroutes.com>',
                  to: normalEmail,
                  reply_to: 'jerry@canvasroutes.com',
                  subject: `Payment confirmed — ${eventLabel}`,
                  html: buildRoadTripConfirmHtml(firstName, eventLabel, amountFormatted, checkinUrl),
                  text: `Hey ${firstName},\n\nYour payment of ${amountFormatted} for ${eventLabel} is confirmed.\n\nYou'll receive a full itinerary and all event details closer to the date. In the meantime, follow @canvasroutes on Instagram for updates.\n\nSee you on the road,\nJerry\nCanvas Routes`,
                }),
              }).catch(err => captureException(err, { context: 'road-trip-payment-confirm-email', email: normalEmail })),
              fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
                body: JSON.stringify({
                  from: 'Canvas Routes <info@canvasroutes.com>',
                  to: 'jerry@canvasroutes.com',
                  subject: `New WTET Registration — ${name || normalEmail}`,
                  text: `New registration for ${eventLabel}\n\nName: ${name || '—'}\nEmail: ${normalEmail}\nAmount: ${amountFormatted}\nType: Non-member (manual capture)\nCar: ${pi.metadata?.car_model || '—'}\nPassengers: ${pi.metadata?.passengers || '—'}\nChildren: ${pi.metadata?.has_children || '—'}\nPI: ${pi.id}`,
                }),
              }).catch(err => captureException(err, { context: 'road-trip-admin-email', email: normalEmail })),
            ])
          }
        }
        break
      }

      case 'payment_intent.requires_capture': {
        // Hold authorized — fires for membership PIs and non-member WTET PIs (manual capture).
        // Member WTET PIs now use automatic capture and go straight to payment_intent.succeeded.
        const pi       = event.data.object
        const { type, email, name, event_name: piEventName } = pi.metadata
        if (!type?.startsWith('membership_') && type !== 'road_trip_wtet') break
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

        // Send registration received email + admin notification for road trip holds
        if (type === 'road_trip_wtet' && process.env.RESEND_API_KEY) {
          const firstName   = (name || '').trim().split(' ')[0] || 'there'
          const eventLabel  = piEventName || 'Whips to Eastern Townships'
          const amountFmt   = `$${(amountHeld / 100).toFixed(2)} CAD`
          await Promise.all([
            // Registrant hold email
            fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
              body: JSON.stringify({
                from: 'Canvas Routes <jerry@canvasroutes.com>',
                to: normalEmail,
                reply_to: 'jerry@canvasroutes.com',
                subject: `Registration received — ${eventLabel}`,
                html: buildRoadTripHoldHtml(firstName, eventLabel, amountFmt),
                text: `Hey ${firstName},\n\nWe've received your registration for ${eventLabel}.\n\nYour ${amountFmt} hold is placed — your card has not been charged. We review every registration personally. If you're confirmed, the charge goes through and you'll receive full event details. If not, the hold is released with no charge.\n\nAdd jerry@canvasroutes.com to your contacts so our reply gets through.\n\nQuestions? Reply to this email.\n\nSee you on the road,\nJerry\nCanvas Routes`,
              }),
            }).catch(err => captureException(err, { context: 'road-trip-hold-email', email: normalEmail })),
            // Admin notification — new non-member registration awaiting review
            fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
              body: JSON.stringify({
                from: 'Canvas Routes <info@canvasroutes.com>',
                to: 'jerry@canvasroutes.com',
                subject: `New WTET Registration (pending review) — ${name || normalEmail}`,
                text: `New non-member registration for ${eventLabel} — awaiting your manual review and capture.\n\nName: ${name || '—'}\nEmail: ${normalEmail}\nHold: ${amountFmt}\nCar: ${pi.metadata?.car_model || '—'}\nPassengers: ${pi.metadata?.passengers || '—'}\nChildren: ${pi.metadata?.has_children || '—'}\nPI: ${pi.id}\n\nLog in to Stripe to capture or release this payment.`,
              }),
            }).catch(err => captureException(err, { context: 'road-trip-hold-admin-email', email: normalEmail })),
          ])
        }
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

      case 'charge.refunded': {
        // Fires when a refund is issued from the Stripe dashboard or API
        const charge = event.data.object
        const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
        if (!piId) break
        const status = charge.refunded ? 'refunded' : 'partially_refunded'
        const supabase = createAdminClient()
        await Promise.all([
          supabase.from('applications')
            .update({ stripe_payment_status: status, stripe_amount_refunded: charge.amount_refunded })
            .eq('stripe_payment_intent_id', piId),
          supabase.from('event_registrations')
            .update({ stripe_payment_status: 'refunded' })
            .eq('stripe_payment_intent_id', piId),
        ]).catch(err => captureException(err, { context: 'charge-refunded-webhook', piId }))
        console.log(`Refund recorded: ${piId} — status ${status}`)
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
