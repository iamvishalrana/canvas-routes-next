import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'

const MAX_RECIPIENTS = 200

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { subject, html, audience, previewText } = await request.json()

  if (!subject?.trim()) return Response.json({ error: 'Subject is required.' }, { status: 400 })
  if (!html?.trim()) return Response.json({ error: 'Email body is required.' }, { status: 400 })
  if (!audience) return Response.json({ error: 'Audience is required.' }, { status: 400 })

  const supabase = createAdminClient()

  // ── Build recipient list ─────────────────────────────────────────────────────

  let recipients = [] // [{ email, name }]

  async function fetchMembers(filters = {}) {
    let q = supabase.from('members').select('email, name, membership_status, tier')
    if (filters.membership_status) q = q.eq('membership_status', filters.membership_status)
    if (filters.tier) q = q.eq('tier', filters.tier)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data || []).filter(m => m.email)
  }

  async function fetchContacts() {
    const { data, error } = await supabase
      .from('contacts')
      .select('application_id, applications(email, name)')
    if (error) throw new Error(error.message)
    return (data || [])
      .map(c => ({ email: c.applications?.email, name: c.applications?.name }))
      .filter(c => c.email)
  }

  try {
    if (audience === 'all_members') {
      recipients = await fetchMembers()
    } else if (audience === 'active_members') {
      recipients = await fetchMembers({ membership_status: 'active' })
    } else if (audience === 'inner_circle') {
      recipients = await fetchMembers({ tier: 'inner_circle' })
    } else if (audience === 'all_contacts') {
      recipients = await fetchContacts()
    } else if (audience === 'everyone') {
      const [members, contacts] = await Promise.all([fetchMembers(), fetchContacts()])
      const seen = new Set()
      for (const r of [...members, ...contacts]) {
        const key = r.email.toLowerCase()
        if (!seen.has(key)) { seen.add(key); recipients.push(r) }
      }
    } else {
      return Response.json({ error: 'Invalid audience.' }, { status: 400 })
    }
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }

  // Cap at 200
  recipients = recipients.slice(0, MAX_RECIPIENTS)

  if (recipients.length === 0) {
    return Response.json({ sent: 0, failed: 0 })
  }

  // ── Send emails ──────────────────────────────────────────────────────────────

  let sent = 0
  let failed = 0

  for (const recipient of recipients) {
    try {
      const body = {
        from: 'Canvas Routes <info@canvasroutes.com>',
        to: recipient.email,
        subject: subject.trim(),
        html,
      }
      if (previewText) body.text = previewText

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        sent++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  return Response.json({ sent, failed })
}
