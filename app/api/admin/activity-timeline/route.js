import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { normalizeEmail } from '../../../../lib/normalizeEmail'
import { formatPaymentType } from '../../../../lib/paymentTypeLabels'

// Read-only, derived activity timeline for one contact (keyed by email). It
// aggregates the timestamped events already recorded across the CRM — nothing
// is written, so it can never drift from the source data and needs no new
// table. Every source is matched by exact (lowercased) email; all app write
// paths store lowercased emails, and .eq() avoids the ilike `_`/`%` wildcard
// trap that could otherwise pull in a different person's events.

const fmtMoney = cents => `$${((cents || 0) / 100).toFixed(2)}`

// Collapse a Resend webhook event_type ('email.opened') to its verb ('opened').
const emailVerb = t => (t || '').split('.').pop()
// Most significant status wins when one email has several webhook rows.
const EMAIL_STATUS_RANK = { complained: 5, bounced: 4, opened: 3, clicked: 2, delivered: 1, sent: 0, delivery_delayed: 0 }
const EMAIL_STATUS_LABEL = { complained: 'Marked as spam', bounced: 'Bounced', opened: 'Opened', clicked: 'Link clicked', delivered: 'Delivered', sent: 'Sent', delivery_delayed: 'Delayed' }

export async function GET(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const email = normalizeEmail(new URL(request.url).searchParams.get('email') || '')
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'A valid email is required.' }, { status: 400 })
  }

  const db = createAdminClient()

  // One parallel batch — each independently resilient so a hiccup on any one
  // source degrades to "that source missing" rather than failing the whole
  // timeline.
  const safe = p => p.then(r => r.data || [], () => [])
  const [apps, members, eventRegs, interest, receipts, emails] = await Promise.all([
    safe(db.from('applications').select('id, created_at, reregistered_at, source, registrations, stripe_paid_at, stripe_payment_status, stripe_payment_type, stripe_payment_intent_id').eq('email', email)),
    safe(db.from('members').select('id, created_at, join_date, tier').eq('email', email)),
    safe(db.from('event_registrations').select('id, event_id, registered_at, amount_paid, stripe_payment_status').eq('email', email)),
    safe(db.from('route_interest').select('id, route_id, created_at').eq('email', email)),
    safe(db.from('payment_receipts').select('id, paid_at, created_at, total_amount, payment_type, stripe_payment_intent_id, promo_code_id').eq('email', email)),
    safe(db.from('email_events').select('id, resend_message_id, event_type, subject, occurred_at, created_at').eq('recipient', email)),
  ])

  // Resolve the human names for the ids referenced above.
  const appIds = apps.map(a => a.id)
  const eventIds = [...new Set(eventRegs.map(r => r.event_id).filter(Boolean))]
  const routeIds = [...new Set(interest.map(r => r.route_id).filter(Boolean))]
  const [contacts, events, routes] = await Promise.all([
    appIds.length ? safe(db.from('contacts').select('id, created_at, application_id').in('application_id', appIds)) : Promise.resolve([]),
    eventIds.length ? safe(db.from('events').select('id, name').in('id', eventIds)) : Promise.resolve([]),
    routeIds.length ? safe(db.from('upcoming_routes').select('id, name').in('id', routeIds)) : Promise.resolve([]),
  ])
  const eventName = new Map(events.map(e => [e.id, e.name]))
  const routeName = new Map(routes.map(r => [r.id, r.name]))

  const items = []
  const push = (ts, kind, title, subtitle = null, tone = 'default') => {
    if (!ts) return // no timestamp → can't place on a timeline; skip
    items.push({ id: `${kind}-${items.length}`, ts, kind, title, subtitle, tone })
  }

  // Payments — payment_receipts is authoritative (has the amount). Track its
  // PaymentIntents so we don't also emit the same charge from applications.
  const receiptPis = new Set(receipts.map(r => r.stripe_payment_intent_id).filter(Boolean))
  for (const r of receipts) {
    push(r.paid_at || r.created_at, 'payment', `Paid ${fmtMoney(r.total_amount)} — ${formatPaymentType(r.payment_type)}`,
      r.promo_code_id ? 'Promo code applied' : null, 'good')
  }

  for (const a of apps) {
    push(a.created_at, 'application', 'Submitted an application', a.source ? `Source: ${a.source}` : null)
    if (a.reregistered_at) push(a.reregistered_at, 'application', 'Returned / re-registered')
    // A paid charge on the application with no matching receipt row (pre-ledger
    // payments) — emit it so older payments still show, without duplicating.
    if (a.stripe_paid_at && a.stripe_payment_status === 'paid' && !receiptPis.has(a.stripe_payment_intent_id)) {
      push(a.stripe_paid_at, 'payment', `Payment — ${formatPaymentType(a.stripe_payment_type)}`, null, 'good')
    }
    for (const reg of (Array.isArray(a.registrations) ? a.registrations : [])) {
      if (!reg?.registered_at) continue // legacy entries with no timestamp
      const ev = reg.event || 'an event'
      if (ev.startsWith('Route Interest —')) {
        // Deduped against the route_interest table below (same action).
        continue
      } else if (ev === 'Canvas Routes Membership') {
        push(reg.registered_at, 'application', `Membership application${reg.tier ? ` — ${reg.tier}` : ''}`)
      } else {
        const att = reg.attended === true ? 'Attended ✓' : reg.attended === false ? 'Did not attend' : reg.paid ? 'Paid' : null
        push(reg.registered_at, 'registration', `Registered — ${ev}`, att, reg.attended === true ? 'good' : 'default')
      }
    }
  }

  for (const c of contacts) push(c.created_at, 'contact', 'Added to contacts')

  for (const m of members) push(m.created_at || m.join_date, 'member', `Became a member${m.tier ? ` — ${formatPaymentType('membership_' + (m.tier === 'inner_circle' ? 'inner_circle' : 'routes'))}` : ''}`, null, 'good')

  for (const r of eventRegs) {
    const paid = (r.amount_paid || 0) > 0
    push(r.registered_at, 'registration', `Registered — ${eventName.get(r.event_id) || 'an event'}`,
      paid ? fmtMoney(r.amount_paid) : (r.stripe_payment_status === 'free' ? 'Free' : null))
  }

  for (const r of interest) push(r.created_at, 'interest', `Expressed interest — ${routeName.get(r.route_id) || 'a route'}`)

  // Emails: collapse the several webhook rows per email (sent → delivered →
  // opened…) into one entry, timestamped at first sight, labelled with the most
  // significant status reached.
  const emailGroups = new Map()
  for (const e of emails) {
    const key = e.resend_message_id || e.id
    const verb = emailVerb(e.event_type)
    const ts = e.occurred_at || e.created_at
    const g = emailGroups.get(key)
    if (!g) {
      emailGroups.set(key, { firstTs: ts, subject: e.subject, bestVerb: verb })
    } else {
      if (ts && (!g.firstTs || ts < g.firstTs)) g.firstTs = ts
      if (!g.subject && e.subject) g.subject = e.subject
      if ((EMAIL_STATUS_RANK[verb] ?? -1) > (EMAIL_STATUS_RANK[g.bestVerb] ?? -1)) g.bestVerb = verb
    }
  }
  for (const g of emailGroups.values()) {
    const warn = g.bestVerb === 'bounced' || g.bestVerb === 'complained'
    push(g.firstTs, 'email', `Email: ${g.subject || '(no subject)'}`,
      EMAIL_STATUS_LABEL[g.bestVerb] || g.bestVerb, warn ? 'warn' : g.bestVerb === 'opened' ? 'good' : 'default')
  }

  // Newest first, with a final safety-net dedup (a payment or interest recorded
  // in two places collapses to one) by kind + title + calendar day.
  items.sort((a, b) => new Date(b.ts) - new Date(a.ts))
  const seen = new Set()
  const deduped = []
  for (const it of items) {
    const k = `${it.kind}|${it.title.toLowerCase()}|${String(it.ts).slice(0, 10)}`
    if (seen.has(k)) continue
    seen.add(k)
    deduped.push(it)
  }

  return Response.json(deduped)
}
