import { createAdminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/supabase/authCheck'

const MAX_RECIPIENTS = 200
const BATCH_SIZE = 10  // parallel sends per batch

export async function POST(request) {
  if (!await requireAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { subject, html, audience, specificEmails } = await request.json()

  if (!subject?.trim()) return Response.json({ error: 'Subject is required.' }, { status: 400 })
  if (!html?.trim()) return Response.json({ error: 'Email body is required.' }, { status: 400 })
  if (!audience) return Response.json({ error: 'Audience is required.' }, { status: 400 })

  const supabase = createAdminClient()
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
    } else if (audience === 'specific_emails') {
      const rawEmails = Array.isArray(specificEmails) ? specificEmails : []
      const uniqueEmails = [...new Set(
        rawEmails.map(e => e.toLowerCase().trim()).filter(e => e.includes('@') && e.includes('.'))
      )]
      if (uniqueEmails.length === 0) return Response.json({ error: 'No valid email addresses provided.' }, { status: 400 })
      // Look up names from DB
      const [membersData, appsData] = await Promise.all([
        supabase.from('members').select('email, name').in('email', uniqueEmails),
        supabase.from('applications').select('email, name').in('email', uniqueEmails),
      ])
      const nameMap = {}
      for (const m of (membersData.data || [])) nameMap[m.email.toLowerCase()] = m.name
      for (const a of (appsData.data || [])) if (!nameMap[a.email.toLowerCase()]) nameMap[a.email.toLowerCase()] = a.name
      recipients = uniqueEmails.map(email => ({ email, name: nameMap[email] || '' }))
    } else {
      return Response.json({ error: 'Invalid audience.' }, { status: 400 })
    }
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }

  recipients = recipients.slice(0, MAX_RECIPIENTS)
  if (recipients.length === 0) return Response.json({ sent: 0, failed: 0 })

  // Send in parallel batches
  let sent = 0
  let failed = 0

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(batch.map(async recipient => {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Canvas Routes <info@canvasroutes.com>',
            to: recipient.email,
            subject: subject.trim(),
            html,
          }),
        })
        return res.ok ? 'sent' : 'failed'
      } catch { return 'failed' }
    }))
    sent   += results.filter(r => r === 'sent').length
    failed += results.filter(r => r === 'failed').length
  }

  return Response.json({ sent, failed })
}
