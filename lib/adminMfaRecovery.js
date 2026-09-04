// Server-only helper for the two admin-MFA recovery methods (recovery codes +
// security questions). All the security-sensitive crypto lives here in ONE
// place so the hashing/verification can't drift between routes. Every secret
// is scrypt-hashed with a per-item random salt; the admin_mfa_recovery table
// only ever stores hashes, never plaintext. Accessed exclusively via the
// service-role client (the table is RLS-deny-all to client roles).
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { createAdminClient } from './supabase/admin'

const TABLE = 'admin_mfa_recovery'
const CODE_COUNT = 10
const SQ_MAX_ATTEMPTS = 5
const SQ_LOCK_MINUTES = 15
// 32 chars, no ambiguous 0/O/1/I — 256 % 32 === 0, so the byte→char map below
// is unbiased. Codes are high-entropy (50 bits each), so brute-forcing one is
// infeasible even before the per-verify rate limit.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// scrypt hash as "saltHex:hashHex". Passing an existing saltHex re-derives the
// same hash for a constant-time compare.
function hashSecret(secret, saltHex) {
  const salt = saltHex || randomBytes(16).toString('hex')
  const derived = scryptSync(String(secret), salt, 32).toString('hex')
  return `${salt}:${derived}`
}
function verifySecret(secret, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) return false
  const [saltHex] = stored.split(':')
  if (!saltHex) return false
  const candidate = Buffer.from(hashSecret(secret, saltHex))
  const known = Buffer.from(stored)
  return candidate.length === known.length && timingSafeEqual(candidate, known)
}

// Recovery code: strip formatting, uppercase (so "abcde fghij" == "ABCDE-FGHIJ").
const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
// Security answer: trim, lowercase, collapse internal whitespace — forgiving of
// casing/spacing so a right answer isn't rejected on a formatting nitpick.
const normAnswer = (a) => String(a || '').trim().toLowerCase().replace(/\s+/g, ' ')

function genCode() {
  const bytes = randomBytes(10)
  let s = ''
  for (let i = 0; i < 10; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return `${s.slice(0, 5)}-${s.slice(5)}`
}

// Generates a fresh set of one-time recovery codes, stores only their hashes
// (replacing any prior set — regenerating invalidates the old ones), and
// returns the plaintext codes ONCE for display. Never call twice expecting the
// old codes to survive.
export async function generateRecoveryCodes(userId) {
  const codes = Array.from({ length: CODE_COUNT }, genCode)
  const recovery_code_hashes = codes.map((c) => ({ h: hashSecret(normCode(c)), u: null }))
  const admin = createAdminClient()
  const { error } = await admin.from(TABLE).upsert(
    { user_id: userId, recovery_code_hashes, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(error.message)
  return codes
}

// Verifies (and single-use-consumes) a recovery code. Returns true on success.
export async function verifyRecoveryCode(userId, code) {
  const norm = normCode(code)
  if (norm.length < 8) return false
  const admin = createAdminClient()
  const { data, error } = await admin.from(TABLE).select('recovery_code_hashes').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  const list = Array.isArray(data?.recovery_code_hashes) ? data.recovery_code_hashes : []
  let matchedIdx = -1
  for (let i = 0; i < list.length; i++) {
    if (!list[i]?.u && verifySecret(norm, list[i]?.h)) { matchedIdx = i; break }
  }
  if (matchedIdx === -1) return false
  list[matchedIdx] = { ...list[matchedIdx], u: new Date().toISOString() }
  const { error: updErr } = await admin.from(TABLE).update({ recovery_code_hashes: list }).eq('user_id', userId)
  if (updErr) throw new Error(updErr.message)
  return true
}

// Stores 3 security questions with hashed answers, replacing any prior set and
// clearing the lockout counters. Validates count/shape defensively.
export async function setSecurityQuestions(userId, qas) {
  if (!Array.isArray(qas) || qas.length !== 3) throw new Error('Exactly 3 security questions are required.')
  const security_questions = qas.map(({ question, answer }) => {
    const q = String(question || '').trim()
    const a = normAnswer(answer)
    if (q.length < 3) throw new Error('Each question must be filled in.')
    if (a.length < 2) throw new Error('Each answer must be at least 2 characters.')
    return { q: q.slice(0, 200), h: hashSecret(a) }
  })
  const admin = createAdminClient()
  const { error } = await admin.from(TABLE).upsert(
    { user_id: userId, security_questions, sq_failed_attempts: 0, sq_locked_until: null, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(error.message)
}

// Verifies ALL security-question answers (order-aligned to the stored
// questions). Enforces a lockout after SQ_MAX_ATTEMPTS wrong tries. Returns
// { ok } | { ok:false, locked, lockedUntil } | { ok:false, remainingAttempts }
// | { ok:false, notConfigured }.
export async function verifySecurityQuestions(userId, answers) {
  const admin = createAdminClient()
  const { data, error } = await admin.from(TABLE)
    .select('security_questions, sq_failed_attempts, sq_locked_until').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  const qs = Array.isArray(data?.security_questions) ? data.security_questions : []
  if (qs.length === 0) return { ok: false, notConfigured: true }
  if (data.sq_locked_until && new Date(data.sq_locked_until) > new Date()) {
    return { ok: false, locked: true, lockedUntil: data.sq_locked_until }
  }

  // Compare every answer regardless of an early mismatch (no short-circuit), so
  // response time doesn't leak which specific answer was wrong.
  let allMatch = Array.isArray(answers) && answers.length === qs.length
  for (let i = 0; i < qs.length; i++) {
    const got = verifySecret(normAnswer(answers?.[i]), qs[i]?.h)
    if (!got) allMatch = false
  }

  if (allMatch) {
    await admin.from(TABLE).update({ sq_failed_attempts: 0, sq_locked_until: null }).eq('user_id', userId)
    return { ok: true }
  }
  const attempts = (data.sq_failed_attempts || 0) + 1
  const lock = attempts >= SQ_MAX_ATTEMPTS
  await admin.from(TABLE).update({
    sq_failed_attempts: lock ? 0 : attempts,
    sq_locked_until: lock ? new Date(Date.now() + SQ_LOCK_MINUTES * 60000).toISOString() : null,
  }).eq('user_id', userId)
  return lock
    ? { ok: false, locked: true, lockedUntil: new Date(Date.now() + SQ_LOCK_MINUTES * 60000).toISOString() }
    : { ok: false, remainingAttempts: SQ_MAX_ATTEMPTS - attempts }
}

// Non-secret status for the Settings UI and the pre-challenge method list.
// Returns counts + the question TEXTS only — never hashes or answers.
export async function getRecoveryStatus(userId) {
  const admin = createAdminClient()
  const { data } = await admin.from(TABLE)
    .select('recovery_code_hashes, security_questions').eq('user_id', userId).maybeSingle()
  const codes = Array.isArray(data?.recovery_code_hashes) ? data.recovery_code_hashes : []
  const qs = Array.isArray(data?.security_questions) ? data.security_questions : []
  return {
    recoveryCodesRemaining: codes.filter((c) => !c?.u).length,
    securityQuestionsSet: qs.length > 0,
    securityQuestions: qs.map((q) => q?.q).filter(Boolean),
  }
}
