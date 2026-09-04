import { describe, it, expect } from 'vitest'
import { mintToken, verifyToken } from './adminMfaToken.js'

// The HMAC session token is what stands in for a login after MFA. A flaw here
// is critical: a verifyToken that accepts a tampered/forged token would let
// anyone bypass the second factor. Every failure mode is checked explicitly.
// (Signing key is derived deterministically from env within one process, so
// mint+verify agree without any env set.)

const base = { uid: 'user-123', email: 'jerry@canvasroutes.com' }

describe('mintToken / verifyToken', () => {
  it('round-trips a valid token and preserves uid/email/epoch', () => {
    const p = verifyToken(mintToken({ ...base, epoch: 4 }))
    expect(p).toBeTruthy()
    expect(p.uid).toBe(base.uid)
    expect(p.email).toBe(base.email)
    expect(p.epoch).toBe(4)
    expect(p.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('defaults epoch to 0', () => {
    expect(verifyToken(mintToken(base)).epoch).toBe(0)
  })

  it('rejects a tampered payload (signature no longer matches)', () => {
    const [v, payloadB64, sig] = mintToken(base).split('.')
    // Flip the payload to claim a different uid, keep the old signature.
    const forged = Buffer.from(JSON.stringify({ uid: 'attacker', email: base.email, epoch: 0, exp: 9999999999 })).toString('base64url')
    expect(verifyToken(`${v}.${forged}.${sig}`)).toBeNull()
  })

  it('rejects a tampered signature', () => {
    const [v, payloadB64] = mintToken(base).split('.')
    expect(verifyToken(`${v}.${payloadB64}.YWJjZGVm`)).toBeNull()
  })

  it('rejects an expired token', () => {
    expect(verifyToken(mintToken({ ...base, ttlSec: -10 }))).toBeNull()
  })

  it('rejects wrong version, wrong shape, and non-strings', () => {
    const good = mintToken(base)
    const [, payloadB64, sig] = good.split('.')
    expect(verifyToken(`v2.${payloadB64}.${sig}`)).toBeNull()
    expect(verifyToken(`${payloadB64}.${sig}`)).toBeNull() // only 2 parts
    expect(verifyToken('')).toBeNull()
    expect(verifyToken(null)).toBeNull()
    expect(verifyToken(undefined)).toBeNull()
    expect(verifyToken('v1.notbase64!!.sig')).toBeNull()
  })
})
