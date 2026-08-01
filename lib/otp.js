// One-time-passcode storage for public, non-Supabase-Auth gates (currently:
// the non-member photo gallery share links, app/gallery/[token]). Reuses the
// same Upstash Redis connection as lib/rateLimit.js (same env vars, same
// client factory) — zero new infrastructure and zero new cost, since Redis
// is already provisioned for rate limiting and this feature's volume is
// trivial against Upstash's free tier. Falls back to an in-memory Map when
// Redis isn't configured (local dev), matching the fallback philosophy
// already established in lib/rateLimit.js, so behavior doesn't silently
// diverge between environments.
import { randomInt, randomBytes, timingSafeEqual } from 'crypto'
import { getRedis } from './rateLimit'

const CODE_TTL_SEC = 10 * 60          // a code is valid for 10 minutes
const SESSION_TTL_SEC = 30 * 24 * 60 * 60 // a verified device is remembered 30 days
const MAX_ATTEMPTS = 5                // wrong codes before the code is invalidated
const MAX_SENDS_PER_WINDOW = 3        // codes issued per (token,email) per window
const SEND_WINDOW_SEC = 10 * 60

// In-memory fallback — single-instance-safe, only used when Redis env vars
// are absent (local dev) or a Redis call throws.
const memCodes = new Map()    // codeKey -> { code, attempts, expiresAt }
const memSends = new Map()    // sendKey -> { count, resetAt }
const memSessions = new Map() // sessionKey -> { token, email, expiresAt }

const now = () => Date.now()
const codeKey = (token, email) => `otp:code:${token}:${email}`
const sendKey = (token, email) => `otp:send:${token}:${email}`
const sessionKey = id => `otp:session:${id}`

// Returns false if too many codes have already been issued for this
// (token,email) pair recently — protects the recipient's inbox from being
// spammed. Separate from the caller's own per-IP checkRateLimit on the route.
export async function canSendCode(token, email) {
  const key = sendKey(token, email)
  const redis = getRedis()
  if (redis) {
    try {
      const count = await redis.incr(key)
      if (count === 1) await redis.expire(key, SEND_WINDOW_SEC)
      return count <= MAX_SENDS_PER_WINDOW
    } catch { /* fall through to in-memory */ }
  }
  const t = now()
  const entry = memSends.get(key)
  if (!entry || t > entry.resetAt) {
    memSends.set(key, { count: 1, resetAt: t + SEND_WINDOW_SEC * 1000 })
    return true
  }
  entry.count += 1
  return entry.count <= MAX_SENDS_PER_WINDOW
}

// Issues a fresh 6-digit code, overwriting any code already pending for this
// pair (so a "Resend" click correctly invalidates the previous code rather
// than leaving two valid codes at once). expiresAt is stored explicitly and
// re-checked in application code as the source of truth for expiry — not
// solely relied on Redis's own TTL — so an attempt-count write that also
// resets Redis's TTL clock can never silently extend how long a code is
// actually honoured.
export async function issueCode(token, email) {
  const code = String(randomInt(0, 1000000)).padStart(6, '0')
  const key = codeKey(token, email)
  const entry = { code, attempts: 0, expiresAt: now() + CODE_TTL_SEC * 1000 }
  const redis = getRedis()
  if (redis) {
    try { await redis.set(key, JSON.stringify(entry), { ex: CODE_TTL_SEC }); return code } catch { /* fall through */ }
  }
  memCodes.set(key, entry)
  return code
}

function readEntry(raw) {
  if (raw == null) return null
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}

// Returns 'ok' | 'invalid' | 'expired' | 'locked' | 'error'.
export async function checkCode(token, email, candidate) {
  const key = codeKey(token, email)
  const redis = getRedis()
  let entry = null
  let readFailed = false

  if (redis) {
    try { entry = readEntry(await redis.get(key)) }
    catch { readFailed = true } // transient Redis error — genuinely unknown state
  } else {
    entry = memCodes.get(key) || null
  }

  // A read failure is NOT the same as "no code was found" — treating it as
  // expired-and-deleting would destroy a still-valid code over nothing but a
  // network blip, forcing a fresh code request for what would've resolved
  // itself on retry. Report it distinctly and touch nothing.
  if (readFailed) return 'error'

  if (!entry || now() > entry.expiresAt) {
    if (redis) { try { await redis.del(key) } catch {} }
    else memCodes.delete(key)
    return 'expired'
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    if (redis) { try { await redis.del(key) } catch {} }
    memCodes.delete(key)
    return 'locked'
  }

  const a = Buffer.from(String(candidate).padStart(6, '0'))
  const b = Buffer.from(entry.code)
  const match = a.length === b.length && timingSafeEqual(a, b)

  if (match) {
    if (redis) { try { await redis.del(key) } catch {} }
    memCodes.delete(key)
    return 'ok'
  }

  entry.attempts += 1
  if (redis) {
    try { await redis.set(key, JSON.stringify(entry), { ex: CODE_TTL_SEC }) } catch {}
  } else {
    memCodes.set(key, entry)
  }
  return 'invalid'
}

// Issues an opaque, unguessable session id after a successful code check —
// stored client-side (localStorage) so a returning visitor on the SAME
// device skips re-entering a code. Deliberately NOT the person's email
// (what the old flow remembered): a random session id can't be guessed or
// reused against a different token, and it's the actual proof that this
// device passed OTP, not just a claim.
export async function createSession(token, email) {
  const id = randomBytes(32).toString('base64url')
  const key = sessionKey(id)
  const entry = { token, email, expiresAt: now() + SESSION_TTL_SEC * 1000 }
  const redis = getRedis()
  if (redis) {
    try { await redis.set(key, JSON.stringify(entry), { ex: SESSION_TTL_SEC }); return id } catch { /* fall through */ }
  }
  memSessions.set(key, entry)
  return id
}

// Returns the verified email for this session if it belongs to this exact
// token, else null. A session minted for one gallery link can't be replayed
// against a different one.
export async function readSession(token, sessionId) {
  if (!sessionId || typeof sessionId !== 'string') return null
  const key = sessionKey(sessionId)
  const redis = getRedis()
  let entry = null

  if (redis) {
    try { entry = readEntry(await redis.get(key)) }
    catch { entry = memSessions.get(key) || null }
  } else {
    entry = memSessions.get(key) || null
  }

  if (!entry || now() > entry.expiresAt || entry.token !== token) return null
  return entry.email
}
