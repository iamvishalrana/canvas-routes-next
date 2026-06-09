import { stripe } from '../../../../lib/stripe.js'
import { createAdminClient } from '../../../../lib/supabase/admin.js'
import { captureException, captureMessage } from '../../../../lib/sentry.js'

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
    return new Response(`Webhook signature error: ${err.message}`, { status: 400 })
  }

  try {
    switch (event.type) {

      case 'payment_intent.succeeded': {
        const pi       = event.data.object
        const { type, email, name, eventName } = pi.metadata
        const amountPaid = pi.amount_received  // cents
        const normalEmail = email?.toLowerCase().trim()

        if (!normalEmail) {
          captureMessage('Stripe payment succeeded but no email in metadata', { piId: pi.id })
          break
        }

        const supabase = createAdminClient()

        // Upsert directly — UPDATE on conflict so stripe fields are always written,
        // whether the application row exists yet or not.
        await supabase.from('applications').upsert({
          email:                     normalEmail,
          name:                      name || '',
          stripe_payment_intent_id:  pi.id,
          stripe_payment_status:     'paid',
          stripe_amount_paid:        amountPaid,
          stripe_payment_type:       type,
          stripe_paid_at:            new Date().toISOString(),
        }, { onConflict: 'email' })

        console.log(`Payment confirmed: ${type} — ${normalEmail} — $${(amountPaid / 100).toFixed(2)} CAD`)
        break
      }

      case 'payment_intent.requires_capture': {
        // Customer authorized the hold — admin approval needed before capture
        const pi       = event.data.object
        const { type, email, name } = pi.metadata
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
        if (email) {
          const supabase = createAdminClient()
          await supabase.from('applications')
            .update({ stripe_payment_intent_id: pi.id, stripe_payment_status: 'failed' })
            .eq('email', email)
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
              const supabase = createAdminClient()
              await supabase.from('applications')
                .update({ stripe_payment_status: 'disputed' })
                .eq('stripe_payment_intent_id', charge.payment_intent)
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
