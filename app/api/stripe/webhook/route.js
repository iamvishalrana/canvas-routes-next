import { stripe } from '../../../../lib/stripe.js'
import { createAdminClient } from '../../../../lib/supabase/admin.js'
import { captureException, captureMessage } from '../../../../lib/sentry.js'
import { buildWtetHoldHtml, buildWtetConfirmHtml } from '../../../../lib/wtetEmail.js'

// Stripe requires the raw body — Next.js must NOT parse it
export const runtime = 'nodejs'


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
          // Write payment fields — update by PI ID so we don't clobber unrelated rows
          const { error: rtDbErr } = await supabase.from('applications')
            .update({
              stripe_payment_status: 'paid',
              stripe_amount_paid:    amountPaid,
              stripe_payment_type:   type,
              stripe_paid_at:        new Date().toISOString(),
            })
            .eq('stripe_payment_intent_id', pi.id)
          if (rtDbErr) captureException(rtDbErr, { context: 'road-trip-payment-db', piId: pi.id })

          // Members get their confirmation email from /api/wtet-member-confirm and
          // the capture routes. Webhook sends for non-members as a fallback in case
          // capture happened via the Stripe dashboard (not the admin panel).
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
                  html: buildWtetConfirmHtml(firstName, amountFormatted, checkinUrl, eventLabel),
                  text: `Hey ${firstName},\n\nYour payment of ${amountFormatted} for ${eventLabel} is confirmed.\n\nYou'll receive a full itinerary and all event details closer to the date. Follow @canvasroutes on Instagram for updates.\n\nSee you on the road,\nJerry\nCanvas Routes`,
                }),
              }).catch(err => captureException(err, { context: 'road-trip-payment-confirm-email', email: normalEmail })),
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
        // Upsert with all form fields stored in PI metadata (written by create-payment-intent
        // for membership PIs) — ensures full application data is saved even if the client
        // closed the tab before /api/membership-waitlist fired.
        await supabase.from('applications').upsert({
          email:                    normalEmail,
          ...(name ? { name } : {}),
          ...(pi.metadata?.phone    ? { phone:    pi.metadata.phone }    : {}),
          ...(pi.metadata?.dob      ? { dob:      pi.metadata.dob }      : {}),
          ...(pi.metadata?.car_year ? { car_year: pi.metadata.car_year } : {}),
          ...(pi.metadata?.car_make ? { car_make: pi.metadata.car_make } : {}),
          ...(pi.metadata?.car_model ? { car_model: pi.metadata.car_model } : {}),
          ...(pi.metadata?.source   ? { source:   pi.metadata.source }   : {}),
          stripe_payment_intent_id: pi.id,
          stripe_payment_status:    'authorized',
          stripe_amount_paid:       amountHeld,
          stripe_payment_type:      type,
        }, { onConflict: 'email', ignoreDuplicates: false })

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
                html: buildWtetHoldHtml(firstName, amountFmt, eventLabel),
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
                await supabase.from('event_registrations')
                  .update({ stripe_payment_status: 'disputed' })
                  .eq('event_id', pi.metadata.event_id)
                  .eq('member_id', pi.metadata.member_id)
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

      case 'charge.dispute.closed': {
        // Fires when a dispute is won (funds reinstated) or lost (funds withdrawn)
        const dispute  = event.data.object
        const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id
        const newStatus = dispute.status === 'won' ? 'disputed_won' : 'disputed_lost'
        captureMessage(`Stripe dispute ${dispute.status} — charge ${chargeId}`, { disputeId: dispute.id })
        if (chargeId) {
          try {
            const charge = await stripe.charges.retrieve(chargeId)
            if (charge.payment_intent) {
              const pi = await stripe.paymentIntents.retrieve(charge.payment_intent)
              const supabase = createAdminClient()
              if (pi.metadata?.type === 'event_registration' && pi.metadata?.event_id && pi.metadata?.member_id) {
                await supabase.from('event_registrations')
                  .update({ stripe_payment_status: newStatus })
                  .eq('event_id', pi.metadata.event_id)
                  .eq('member_id', pi.metadata.member_id)
              } else {
                await supabase.from('applications')
                  .update({ stripe_payment_status: newStatus })
                  .eq('stripe_payment_intent_id', charge.payment_intent)
              }
            }
          } catch (err) {
            captureException(err, { context: 'dispute-closed-webhook', chargeId })
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
    // Return 500 so Stripe retries with exponential backoff (up to 72h).
    // All handlers use upsert, so duplicate delivery on retry is safe.
    return new Response('Handler error.', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
