import { createAdminClient } from '../../../../lib/supabase/admin'
import { captureException, captureMessage } from '../../../../lib/sentry.js'
import { verifyResendWebhook } from '../../../../lib/resendWebhook.js'

export const runtime = 'nodejs'

export async function POST(request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return new Response('Not configured.', { status: 503 })

  const rawBody = await request.text()
  const { valid, svixId, reason } = verifyResendWebhook(rawBody, request.headers, secret)
  if (!valid) {
    captureMessage('Resend webhook signature verification failed', { reason })
    return new Response('Invalid signature.', { status: 400 })
  }

  let event
  try {
    event = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON.', { status: 400 })
  }

  const data = event.data || {}
  // "message_id" was only added to webhook payloads in Resend's July 2026
  // release — fall back to email_id (the field every event has always had)
  // so nothing breaks if a given event type hasn't rolled the new field out.
  const resendMessageId = data.message_id || data.email_id
  if (!resendMessageId) {
    captureMessage('Resend webhook missing message/email id', { type: event.type })
    return new Response('ok', { status: 200 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('email_events').upsert({
    svix_id: svixId,
    resend_message_id: resendMessageId,
    event_type: event.type || 'unknown',
    recipient: Array.isArray(data.to) ? data.to[0] : (data.to || null),
    subject: data.subject || null,
    from_address: data.from || null,
    // Resend mirrors AWS SES's bounce shape — defensive optional-chaining
    // since the exact field names aren't documented with a full example yet.
    bounce_type: data.bounce ? [data.bounce.type, data.bounce.subType].filter(Boolean).join('/') : null,
    occurred_at: event.created_at || new Date().toISOString(),
    raw: event,
  }, { onConflict: 'svix_id', ignoreDuplicates: true })

  if (error) {
    // Throw so this returns 500 and Resend/Svix retries delivery
    captureException(new Error(error.message), { context: 'resend-webhook-upsert', svixId })
    return new Response('Storage error.', { status: 500 })
  }

  return new Response('ok', { status: 200 })
}
