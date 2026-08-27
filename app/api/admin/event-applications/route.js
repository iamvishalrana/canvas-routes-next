import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'
import { normalizeEventName } from '../../../../lib/eventMeta.js'

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()

  const [{ data: events }, { data: apps }, { data: tokens }, { data: members }, { data: eventRegs }] = await Promise.all([
    supabase.from('events').select('id, name, date, date_display, location, type, capacity').order('date', { ascending: true }),
    supabase.from('applications').select('id, name, email, phone, car_year, car_model, car_paint, source, registrations, is_member, stripe_payment_status, stripe_payment_type, stripe_amount_paid, created_at'),
    supabase.from('rsvp_tokens').select('application_id, event_name, confirmed_at, answers, expires_at, token, created_at'),
    supabase.from('members').select('email, tier'),
    supabase.from('event_registrations').select('event_id, email, stripe_payment_status').in('stripe_payment_status', ['paid', 'free', 'authorized']),
  ])

  if (!events) return Response.json({ error: 'Failed to load events' }, { status: 500 })

  // Build a lookup: email → member tier
  const tierByEmail = {}
  for (const m of (members || [])) if (m.email) tierByEmail[m.email.toLowerCase()] = m.tier

  // Build a lookup: event_name → array of rsvp tokens. Key by the NORMALIZED
  // name — tokens created before an event rename otherwise silently detach.
  const tokensByEvent = {}
  for (const t of (tokens || [])) {
    const key = normalizeEventName(t.event_name)
    if (!tokensByEvent[key]) tokensByEvent[key] = []
    tokensByEvent[key].push(t)
  }

  // Build a lookup: event_id → Set of registrant emails from the member-portal registration flow.
  // These registrants never get a matching entry in applications.registrations, so they must be
  // counted separately or "Applied" undercounts events that use member-portal registration (e.g. WTET).
  // Also track which of those hold a secured spot, for the Confirmed count below — 'free' counts
  // same as 'paid' here because both consume real capacity (see the register_for_event RPC, which
  // blocks new signups once COUNT(*) WHERE status IN ('free','paid') >= capacity); 'authorized' is
  // a payment hold that hasn't been captured yet, so it doesn't count as confirmed.
  const regEmailsByEvent = {}
  const paidRegEmailsByEvent = {}
  for (const r of (eventRegs || [])) {
    if (!r.email) continue
    const email = r.email.toLowerCase()
    if (!regEmailsByEvent[r.event_id]) regEmailsByEvent[r.event_id] = new Set()
    regEmailsByEvent[r.event_id].add(email)
    if (r.stripe_payment_status === 'paid' || r.stripe_payment_status === 'free') {
      if (!paidRegEmailsByEvent[r.event_id]) paidRegEmailsByEvent[r.event_id] = new Set()
      paidRegEmailsByEvent[r.event_id].add(email)
    }
  }

  // Build a lookup: application id → email, to resolve emails for rsvp_tokens (which key by application_id)
  const appEmailById = {}
  for (const a of (apps || [])) if (a.email) appEmailById[a.id] = a.email.toLowerCase()

  // For each event, find applications that registered for it (match by event name).
  // A registration whose review_status is 'declined' (the /meet/[id] public
  // review flow — see app/api/public/events/[id]/register and
  // app/api/admin/events/[id]/registrants/review) is excluded here the same
  // way lib/eventCheckinShared.js's listEventRegistrants already excludes it
  // from the registrants panel itself — otherwise "Applied" only ever grows,
  // even for someone the admin explicitly turned away.
  const result = (events || []).map(ev => {
    const evName = normalizeEventName(ev.name)?.trim().toLowerCase()
    const evBase = evName.split(/\s[—–]\s/)[0].trim()
    const matchReg = a => (a.registrations || []).find(r => {
      const rName = normalizeEventName(r.event)?.trim().toLowerCase() || ''
      return rName === evName || rName.split(/\s[—–]\s/)[0].trim() === evBase
    })
    const evApps = (apps || []).filter(a => {
      const r = matchReg(a)
      return r && r.review_status !== 'declined'
    })
    const evAppEmails = new Set(evApps.map(a => a.email?.toLowerCase()).filter(Boolean))
    const evRegEmails = regEmailsByEvent[ev.id] || new Set()
    const totalApplicants = new Set([...evAppEmails, ...evRegEmails]).size

    // Attach RSVP status per application
    const evTokens = tokensByEvent[normalizeEventName(ev.name)] || []
    const tokenByApp = {}
    for (const t of evTokens) tokenByApp[t.application_id] = t

    const appsWithRsvp = evApps.map(a => ({
      ...a,
      rsvp: tokenByApp[a.id] || null,
      member_tier: tierByEmail[a.email?.toLowerCase()] || null,
    }))

    // Confirmed = RSVP'd via the confirm-your-spot flow, already paid (a completed
    // payment secures the spot outright regardless of whether the RSVP form was
    // filled in), or accepted through the /meet/[id] review flow — that flow never
    // touches rsvp_tokens or Stripe, so without this an admin who accepts every
    // pending registrant still sees "Confirmed: 0" forever.
    const confirmedKeys = new Set()
    for (const t of evTokens) {
      if (!t.confirmed_at) continue
      confirmedKeys.add(appEmailById[t.application_id] || `token:${t.application_id}`)
    }
    for (const a of evApps) {
      if (a.stripe_payment_status === 'paid' && a.email) confirmedKeys.add(a.email.toLowerCase())
      if (matchReg(a)?.review_status === 'accepted' && a.email) confirmedKeys.add(a.email.toLowerCase())
    }
    for (const email of (paidRegEmailsByEvent[ev.id] || [])) confirmedKeys.add(email)

    // Pending = still awaiting an Accept/Decline decision in the review flow —
    // surfaced as its own stat so "9 people are waiting on you" isn't buried
    // inside "Applied", which also money-flows/road-trip apps.
    const pendingCount = evApps.filter(a => matchReg(a)?.review_status === 'pending').length

    const confirmedCount = confirmedKeys.size
    const invitedCount   = evTokens.length

    return {
      ...ev,
      applications: appsWithRsvp,
      total_applications: totalApplicants,
      invited_count: invitedCount,
      confirmed_count: confirmedCount,
      pending_review_count: pendingCount,
    }
  })

  // Short client-side cache so quickly flipping between admin tabs doesn't always
  // cold-refetch — realtime sync still pushes updates within the window.
  return Response.json(result, { headers: { 'Cache-Control': 'private, max-age=15' } })
}
