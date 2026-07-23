import crypto from 'crypto'

// Same Pixel ID already hardcoded client-side in components/CookieBanner.jsx
// (fbq('init', ...)) — CAPI events must post to that exact pixel or Meta
// won't be able to deduplicate them against the browser-side event.
const PIXEL_ID = '1499785301931870'
const API_VERSION = 'v21.0'

function sha256(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex')
}

// Reads the _fbc/_fbp cookies Meta's pixel sets in the visitor's browser —
// call this from a route that receives the original registration request
// (which carries the visitor's cookies) and stash the result in PI metadata,
// since a later webhook call has no browser/cookies of its own to read from.
export function getFbCookiesFromRequest(request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const get = name => {
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
    return match ? decodeURIComponent(match[1]) : null
  }
  return { fbc: get('_fbc'), fbp: get('_fbp') }
}

// Sends one event to Meta's Conversions API. No-ops (not throws) when the
// access token isn't configured — same "degrade gracefully when key absent"
// convention as Stripe/Resend/Anthropic elsewhere in this codebase, since a
// missing token shouldn't ever block a real payment/registration.
//
// eventId MUST match the eventID passed to the client-side fbq() call for
// the same logical event (the Stripe PaymentIntent id is used for this
// throughout) — that's what lets Meta dedupe the browser pixel event against
// this server-side one instead of double-counting the conversion.
export async function sendMetaCapiEvent({
  eventName, eventId, eventSourceUrl,
  email, phone, clientIp, clientUserAgent, fbc, fbp,
  value, currency, contentName,
}) {
  const token = process.env.META_CAPI_ACCESS_TOKEN
  if (!token) return

  const userData = {}
  if (email) userData.em = [sha256(email)]
  if (phone) {
    const digits = String(phone).replace(/\D/g, '')
    if (digits) userData.ph = [sha256(digits)]
  }
  if (clientIp) userData.client_ip_address = clientIp
  if (clientUserAgent) userData.client_user_agent = clientUserAgent
  if (fbc) userData.fbc = fbc
  if (fbp) userData.fbp = fbp

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'website',
      ...(eventSourceUrl ? { event_source_url: eventSourceUrl } : {}),
      user_data: userData,
      custom_data: {
        ...(value != null ? { value, currency: currency || 'CAD' } : {}),
        ...(contentName ? { content_name: contentName } : {}),
      },
    }],
    // Lets you verify events in Events Manager's Test Events tool before
    // trusting them — set META_CAPI_TEST_EVENT_CODE temporarily, then unset it.
    ...(process.env.META_CAPI_TEST_EVENT_CODE ? { test_event_code: process.env.META_CAPI_TEST_EVENT_CODE } : {}),
  }

  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Meta CAPI ${eventName} failed (${res.status}): ${text.slice(0, 300)}`)
  }
}
