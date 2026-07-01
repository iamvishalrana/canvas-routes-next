import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = createAdminClient()

  const [{ data: events }, { data: apps }, { data: tokens }, { data: members }, { data: eventRegs }] = await Promise.all([
    supabase.from('events').select('id, name, date, date_display, location, type, capacity').order('date', { ascending: true }),
    supabase.from('applications').select('id, name, email, phone, car_year, car_model, car_paint, source, registrations, is_member, stripe_payment_status, stripe_payment_type, stripe_amount_paid, created_at'),
    supabase.from('rsvp_tokens').select('application_id, event_name, confirmed_at, answers, expires_at, token, created_at'),
    supabase.from('members').select('email, tier'),
    supabase.from('event_registrations').select('event_id, email').in('stripe_payment_status', ['paid', 'free', 'authorized']),
  ])

  if (!events) return Response.json({ error: 'Failed to load events' }, { status: 500 })

  // Build a lookup: email → member tier
  const tierByEmail = {}
  for (const m of (members || [])) if (m.email) tierByEmail[m.email.toLowerCase()] = m.tier

  // Build a lookup: event_name → array of rsvp tokens
  const tokensByEvent = {}
  for (const t of (tokens || [])) {
    if (!tokensByEvent[t.event_name]) tokensByEvent[t.event_name] = []
    tokensByEvent[t.event_name].push(t)
  }

  // Build a lookup: event_id → Set of registrant emails from the member-portal registration flow.
  // These registrants never get a matching entry in applications.registrations, so they must be
  // counted separately or "Applied" undercounts events that use member-portal registration (e.g. WTET).
  const regEmailsByEvent = {}
  for (const r of (eventRegs || [])) {
    if (!r.email) continue
    if (!regEmailsByEvent[r.event_id]) regEmailsByEvent[r.event_id] = new Set()
    regEmailsByEvent[r.event_id].add(r.email.toLowerCase())
  }

  // For each event, find applications that registered for it (match by event name)
  const result = (events || []).map(ev => {
    const evName = ev.name?.trim().toLowerCase()
    const evBase = evName.split(/\s[—–]\s/)[0].trim()
    const evApps = (apps || []).filter(a =>
      (a.registrations || []).some(r => {
        const rName = r.event?.trim().toLowerCase() || ''
        return rName === evName || rName.split(/\s[—–]\s/)[0].trim() === evBase
      })
    )
    const evAppEmails = new Set(evApps.map(a => a.email?.toLowerCase()).filter(Boolean))
    const evRegEmails = regEmailsByEvent[ev.id] || new Set()
    const totalApplicants = new Set([...evAppEmails, ...evRegEmails]).size

    // Attach RSVP status per application
    const evTokens = tokensByEvent[ev.name] || []
    const tokenByApp = {}
    for (const t of evTokens) tokenByApp[t.application_id] = t

    const appsWithRsvp = evApps.map(a => ({
      ...a,
      rsvp: tokenByApp[a.id] || null,
      member_tier: tierByEmail[a.email?.toLowerCase()] || null,
    }))

    const confirmedCount = evTokens.filter(t => t.confirmed_at).length
    const invitedCount   = evTokens.length

    return {
      ...ev,
      applications: appsWithRsvp,
      total_applications: totalApplicants,
      invited_count: invitedCount,
      confirmed_count: confirmedCount,
    }
  })

  return Response.json(result)
}
