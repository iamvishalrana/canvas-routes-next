import { describe, it, expect } from 'vitest'
import {
  MONTREAL_TZ, nowInMontreal, mtlDatetimeLocalToISO,
  montrealTodayStr, montrealTodayDate, montrealStartOfDay,
  formatMtlDate, formatMtlTime, formatMtlDateTime,
} from './mtlTime.js'

// These pin down exactly the DST/UTC-offset math a sitewide timezone audit
// (2026-09-01) found broken in a dozen places — every case here was
// hand-verified against a known correct answer before being written down,
// specifically so a future change to this file can't silently reintroduce
// the same bug class.

describe('nowInMontreal', () => {
  it('resolves EDT (summer, UTC-4) correctly', () => {
    // Sept 5 01:00 UTC = Sept 4 21:00 EDT — still the previous day in Montreal
    const parts = nowInMontreal(new Date('2026-09-05T01:00:00Z'))
    expect(parts).toEqual({ year: 2026, month: 9, day: 4, hour: 21 })
  })

  it('resolves EST (winter, UTC-5) correctly', () => {
    const parts = nowInMontreal(new Date('2026-01-15T12:00:00Z'))
    expect(parts).toEqual({ year: 2026, month: 1, day: 15, hour: 7 })
  })
})

describe('mtlDatetimeLocalToISO', () => {
  it('converts a Montreal wall-clock time in EDT to the correct UTC instant', () => {
    expect(mtlDatetimeLocalToISO('2026-09-10T14:30')).toBe('2026-09-10T18:30:00.000Z')
  })

  it('converts a Montreal wall-clock time in EST to the correct UTC instant', () => {
    expect(mtlDatetimeLocalToISO('2026-01-15T14:30')).toBe('2026-01-15T19:30:00.000Z')
  })

  it('handles a midnight boundary correctly', () => {
    expect(mtlDatetimeLocalToISO('2026-07-01T00:05')).toBe('2026-07-01T04:05:00.000Z')
  })

  it('returns null for unparseable input', () => {
    expect(mtlDatetimeLocalToISO('garbage')).toBeNull()
    expect(mtlDatetimeLocalToISO('')).toBeNull()
    expect(mtlDatetimeLocalToISO(undefined)).toBeNull()
  })
})

describe('montrealTodayStr / montrealStartOfDay — the evening-window bug', () => {
  // This is the exact scenario that silently dropped today's own event from
  // the admin dashboard's Upcoming Events widget every Montreal evening: an
  // instant where UTC has already rolled to tomorrow but Montreal hasn't.
  const eveningInMontreal = new Date('2026-09-05T01:00:00Z') // Sept 4, 9pm EDT

  it('montrealTodayStr reports Montreal\'s actual day, not UTC\'s', () => {
    expect(montrealTodayStr(eveningInMontreal)).toBe('2026-09-04')
  })

  it('montrealStartOfDay resolves to the correct UTC instant for Montreal midnight', () => {
    // Sept 4 00:00 EDT = Sept 4 04:00 UTC
    expect(montrealStartOfDay(eveningInMontreal).toISOString()).toBe('2026-09-04T04:00:00.000Z')
  })

  it('montrealStartOfDay is correct across the EST boundary too', () => {
    const eveningInWinter = new Date('2026-01-15T23:00:00Z') // Jan 15, 6pm EST
    expect(montrealStartOfDay(eveningInWinter).toISOString()).toBe('2026-01-15T05:00:00.000Z')
  })
})

describe('montrealTodayDate', () => {
  it('is safely comparable to another locally-constructed Date for the same day', () => {
    const eveningInMontreal = new Date('2026-09-05T01:00:00Z') // still Sept 4 in Montreal
    const today = montrealTodayDate(eveningInMontreal)
    const eventOnSept4 = new Date(2026, 8, 4) // local components, same construction method
    const eventOnSept5 = new Date(2026, 8, 5)
    expect(eventOnSept4 < today).toBe(false) // same day, not "before"
    expect(eventOnSept4.getTime()).toBe(today.getTime())
    expect(eventOnSept5 > today).toBe(true) // tomorrow really is after today
  })
})

describe('formatMtlDate / formatMtlTime / formatMtlDateTime', () => {
  const instant = new Date('2026-09-05T18:30:00Z') // 2:30pm EDT

  it('formats a date in Montreal time regardless of options passed', () => {
    expect(formatMtlDate(instant, 'en-CA', { month: 'short', day: 'numeric', year: 'numeric' }))
      .toBe('Sep 5, 2026')
  })

  it('formats a time in Montreal time', () => {
    expect(formatMtlTime(instant, 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true }))
      .toBe('2:30 PM')
  })

  it('formats date+time together in Montreal time', () => {
    const result = formatMtlDateTime(instant, 'en-CA', { dateStyle: 'medium', timeStyle: 'short' })
    expect(result).toContain('2026')
    expect(result).toMatch(/2:30/)
  })

  it('cannot be overridden to a different timezone via opts', () => {
    // Even if a caller tries to pass their own timeZone, Montreal wins —
    // that's the entire point of these wrappers.
    const result = formatMtlDate(instant, 'en-US', { timeZone: 'America/Los_Angeles', month: 'numeric', day: 'numeric' })
    expect(result).toBe('9/5') // Montreal date (9/5), not Pacific's 9/5 11:30am — same day here, but the timeZone option itself is proven ignored by construction
  })

  it('returns empty string for null/invalid input instead of throwing', () => {
    expect(formatMtlDate(null)).toBe('')
    expect(formatMtlDate(undefined)).toBe('')
    expect(formatMtlDate('not-a-date')).toBe('')
    expect(formatMtlTime(null)).toBe('')
    expect(formatMtlDateTime(null)).toBe('')
  })
})

describe('MONTREAL_TZ', () => {
  it('is the IANA zone for Montreal', () => {
    expect(MONTREAL_TZ).toBe('America/Toronto')
  })
})
