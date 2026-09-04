import { describe, it, expect } from 'vitest'
import { hashSecret, verifySecret, normCode, normAnswer, genCode } from './adminMfaRecovery.js'

// These guard the security-critical primitives behind admin MFA recovery codes
// and security questions. A regression here is catastrophic — e.g. a
// verifySecret that returns true for the wrong secret would let anyone past
// the second factor — so every case is checked explicitly.

describe('hashSecret / verifySecret', () => {
  it('produces a salted "salt:hash" string, unique per call', () => {
    const a = hashSecret('hunter2')
    const b = hashSecret('hunter2')
    expect(a).toMatch(/^[0-9a-f]{32}:[0-9a-f]{64}$/)
    expect(a).not.toBe(b) // different random salt each time
  })

  it('verifies the correct secret and rejects a wrong one', () => {
    const stored = hashSecret('correct horse')
    expect(verifySecret('correct horse', stored)).toBe(true)
    expect(verifySecret('correct-horse', stored)).toBe(false)
    expect(verifySecret('Correct Horse', stored)).toBe(false) // exact-match (callers normalize first)
    expect(verifySecret('', stored)).toBe(false)
  })

  it('never throws / always false on malformed stored values', () => {
    expect(verifySecret('x', null)).toBe(false)
    expect(verifySecret('x', undefined)).toBe(false)
    expect(verifySecret('x', '')).toBe(false)
    expect(verifySecret('x', 'nocolon')).toBe(false)
    expect(verifySecret('x', ':')).toBe(false)
    expect(verifySecret('x', 12345)).toBe(false)
  })
})

describe('normCode', () => {
  it('uppercases and strips dashes/spaces so display formatting is irrelevant', () => {
    expect(normCode('abcde-fghij')).toBe('ABCDEFGHIJ')
    expect(normCode('ABCDE FGHIJ')).toBe('ABCDEFGHIJ')
    expect(normCode(' abc-de ')).toBe('ABCDE')
    expect(normCode(null)).toBe('')
    expect(normCode(undefined)).toBe('')
  })

  it('a formatted code and its normalized form hash-match, off-by-one does not', () => {
    const code = genCode()
    const stored = hashSecret(normCode(code))
    expect(verifySecret(normCode(code.toLowerCase()), stored)).toBe(true)
    expect(verifySecret(normCode('AAAAA-AAAAA'), stored)).toBe(false)
  })
})

describe('normAnswer', () => {
  it('trims, lowercases, and collapses internal whitespace', () => {
    expect(normAnswer('  Hello   World ')).toBe('hello world')
    expect(normAnswer('FIDO')).toBe('fido')
    expect(normAnswer('\tSt-\tSauveur ')).toBe('st- sauveur')
    expect(normAnswer(null)).toBe('')
  })
})

describe('genCode', () => {
  it('always matches the XXXXX-XXXXX shape using only the safe alphabet', () => {
    const re = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/
    for (let i = 0; i < 200; i++) expect(genCode()).toMatch(re)
  })

  it('never emits ambiguous characters (0/O/1/I) and is effectively unique', () => {
    const codes = new Set()
    for (let i = 0; i < 500; i++) {
      const c = genCode()
      expect(c).not.toMatch(/[01OI]/)
      codes.add(c)
    }
    expect(codes.size).toBe(500) // 50 bits of entropy — no collisions
  })
})
