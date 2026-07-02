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
  // Also track which of those are actually paid, for the Confirmed count below.
  const regEmailsByEvent = {}
  const paidRegEmailsByEvent = {}
  for (const r of (eventRegs || [])) {
    if (!r.email) continue
    const email = r.email.toLowerCase()
    if (!regEmailsByEvent[r.event_id]) regEmailsByEvent[r.event_id] = new Set()
    regEmailsByEvent[r.event_id].add(email)
    if (r.stripe_payment_status === 'paid') {
      if (!paidRegEmailsByEvent[r.event_id]) paidRegEmailsByEvent[r.event_id] = new Set()
      paidRegEmailsByEvent[r.event_id].add(email)
    }
  }

  // Build a lookup: application id → email, to resolve emails for rsvp_tokens (which key by application_id)
  const appEmailById = {}
  for (const a of (apps || [])) if (a.email) appEmailById[a.id] = a.email.toLowerCase()

  // For each event, find applications that registered for it (match by event name)
  const result = (events || []).map(ev => {
    const evName = normalizeEventName(ev.name)?.trim().toLowerCase()
    const evBase = evName.split(/\s[—–]\s/)[0].trim()
    const evApps = (apps || []).filter(a =>
      (a.registrations || []).some(r => {
        const rName = normalizeEventName(r.event)?.trim().toLowerCase() || ''
        return rName === evName || rName.split(/\s[—–]\s/)[0].trim() === evBase
      })
    )
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

    // Confirmed = RSVP'd via the confirm-your-spot flow, OR already paid — a completed
    // payment secures the spot outright regardless of whether the RSVP form was filled in.
    const confirmedKeys = new Set()
    for (const t of evTokens) {
      if (!t.confirmed_at) continue
      confirmedKeys.add(appEmailById[t.application_id] || `token:${t.application_id}`)
    }
    for (const a of evApps) {
      if (a.stripe_payment_status === 'paid' && a.email) confirmedKeys.add(a.email.toLowerCase())
    }
    for (const email of (paidRegEmailsByEvent[ev.id] || [])) confirmedKeys.add(email)

    const confirmedCount = confirmedKeys.size
    const invitedCount   = evTokens.length

    return {
      ...ev,
      applications: appsWithRsvp,
      total_applications: totalApplicants,
      invited_count: invitedCount,
      confirmed_count: confirmedCount,
    }
  })

  // Short client-side cache so quickly flipping between admin tabs doesn't always
  // cold-refetch — realtime sync still pushes updates within the window.
  return Response.json(result, { headers: { 'Cache-Control': 'private, max-age=15' } })
}
