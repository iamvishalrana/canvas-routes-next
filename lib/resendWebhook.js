import { createHmac, timingSafeEqual } from 'crypto'

// Resend signs webhooks using Svix's scheme (svix-id / svix-timestamp /
// svix-signature headers) rather than a Resend-specific one — verified here
// by hand instead of pulling in the svix package, matching this project's
// convention of calling providers directly (see Resend send calls, no SDK).
// https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests
const TOLERANCE_SECONDS = 5 * 60

export function verifyResendWebhook(rawBody, headers, secret) {
  const svixId = headers.get('svix-id')
  const svixTimestamp = headers.get('svix-timestamp')
  const svixSignature = headers.get('svix-signature')
  if (!svixId || !svixTimestamp || !svixSignature) return { valid: false, reason: 'missing headers' }

  const timestamp = parseInt(svixTimestamp, 10)
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) {
    return { valid: false, reason: 'timestamp out of tolerance' }
  }

  // Secret is "whsec_<base64>" — strip the prefix before decoding
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`
  const expected = createHmac('sha256', secretBytes).update(signedContent).digest('base64')
  const expectedBuf = Buffer.from(expected)

  // svix-signature can carry multiple space-separated "v1,<sig>" values
  // (secret rotation) — valid if any of them match.
  const provided = svixSignature.split(' ').map(s => s.split(',')[1]).filter(Boolean)
  const matched = provided.some(sig => {
    const sigBuf = Buffer.from(sig, 'base64')
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)
  })

  return matched ? { valid: true, svixId } : { valid: false, reason: 'signature mismatch' }
}
