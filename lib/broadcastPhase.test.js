import { describe, it, expect } from 'vitest'
import { broadcastPhase } from './broadcastPhase.js'

// broadcastPhase() gates real actions: whether Delete is offered (must never
// be available while still 'scheduled', or you orphan a pending Resend send
// with no way left to cancel it), and whether Cancel is offered (must never
// be available once already 'sent' or 'canceled'). Wrong here is a real
// bug, not just a display glitch — see the DELETE-route guard and cancel
// route in app/api/admin/broadcasts/ that both depend on this.

describe('broadcastPhase', () => {
  it('is "canceled" whenever canceled_at is set, regardless of sent_at', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    const past = new Date(Date.now() - 86400000).toISOString()
    expect(broadcastPhase({ canceled_at: new Date().toISOString(), sent_at: future })).toBe('canceled')
    expect(broadcastPhase({ canceled_at: new Date().toISOString(), sent_at: past })).toBe('canceled')
  })

  it('is "scheduled" when sent_at is in the future and not canceled', () => {
    const future = new Date(Date.now() + 3600000).toISOString()
    expect(broadcastPhase({ canceled_at: null, sent_at: future })).toBe('scheduled')
  })

  it('is "sent" when sent_at is in the past and not canceled', () => {
    const past = new Date(Date.now() - 3600000).toISOString()
    expect(broadcastPhase({ canceled_at: null, sent_at: past })).toBe('sent')
  })

  it('is "sent" for an immediate send (sent_at effectively now)', () => {
    expect(broadcastPhase({ canceled_at: null, sent_at: new Date().toISOString() })).toBe('sent')
  })

  it('treats a missing sent_at as "sent", not "scheduled"', () => {
    expect(broadcastPhase({ canceled_at: null, sent_at: null })).toBe('sent')
  })
})
