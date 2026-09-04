// Self-contained, HMAC-signed admin MFA session token — the token IS the
// session, so verifying it needs no Redis (unlike lib/otp.js's opaque
// Redis-backed sessions, which the gallery still uses). This is what lets an
// admin's MFA login survive a Redis/Upstash outage: recovery codes and
// security questions verify against Postgres, then mint one of these tokens,
// so there's a complete Redis-independent way back in.
//
// Format:  v1.<base64url(payload JSON)>.<base64url(HMAC-SHA256(payload))>
// Payload: { uid, email, epoch, exp }
//   - uid/email : bind the token to one account; middleware re-checks both.
//   - epoch     : the account's app_metadata.mfa_session_epoch (default 0).
//                 Bumping that epoch invalidates every prior token at once —
//                 a built-in "log out of all devices" hook, unused for now.
//   - exp       : unix seconds; hard expiry independent of any store.
import { createHmac, createHash, timingSafeEqual } from 'crypto'
import { ADMIN_MFA_SESSION_TTL_SEC } from './adminMfa'

const VERSION = 'v1'

// Prefer a dedicated secret; otherwise derive a distinct, stable key from the
// service-role key (always present in every environment that can run this), so
// the feature works out of the box and never locks admins out over a missing
// env var. Setting ADMIN_MFA_SESSION_SECRET later takes precedence. Rotating
// either just forces a re-challenge on next request — harmless.
function signingKey() {
  const dedicated = process.env.ADMIN_MFA_SESSION_SECRET
  if (dedicated) return dedicated
  const base = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return createHash('sha256').update(`admin-mfa-session-v1:${base}`).digest('hex')
}

const nowSec = () => Math.floor(Date.now() / 1000)
const sign = (payloadB64) => createHmac('sha256', signingKey()).update(payloadB64).digest('base64url')

// Mint a token for the given account. epoch/ttl default sensibly.
export function mintToken({ uid, email, epoch = 0, ttlSec = ADMIN_MFA_SESSION_TTL_SEC }) {
  const payload = { uid, email, epoch: Number(epoch) || 0, exp: nowSec() + ttlSec }
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${VERSION}.${payloadB64}.${sign(payloadB64)}`
}

// Verify signature + expiry only. Returns the decoded payload, or null if the
// token is missing/tampered/expired/wrong-version. The caller (middleware)
// separately checks uid/email/epoch against the live user — this function
// deliberately does NOT, so it stays a pure crypto primitive that's easy to test.
export function verifyToken(token) {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== VERSION) return null
  const [, payloadB64, sig] = parts

  const expected = Buffer.from(sign(payloadB64))
  const got = Buffer.from(sig)
  // Length check guards timingSafeEqual (throws on length mismatch) and is
  // itself the fast-reject for a wrong signature.
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null

  let payload
  try { payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) } catch { return null }
  if (!payload || typeof payload.uid !== 'string' || typeof payload.email !== 'string') return null
  if (typeof payload.exp !== 'number' || payload.exp < nowSec()) return null
  payload.epoch = Number(payload.epoch) || 0
  return payload
}
